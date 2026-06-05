import { LABELS, AI_REASONING_EFFORT } from '../constants/ui-config.js';
import { CLASSES } from '../constants/place-classes.js';
import { openai, getAiModel } from './ai-core.js';
import { ANALYSIS_CACHE_KEY as CACHE_KEY, CACHE_TTL } from '../constants/cache-config.js';
import { withPerformance } from './performance.js';
import { createLogger } from './logger.js';

const logger = createLogger('ai.analysis');

function loadAnalysisCache() {
	if (typeof localStorage === 'undefined') return {};

	try {
		const stored = localStorage.getItem(CACHE_KEY);
		if (stored) {
			const cache = JSON.parse(stored);
			const now = Date.now();
			// Clean expired entries and return valid ones
			const validCache = {};
			for (const [key, value] of Object.entries(cache)) {
				if (value.timestamp && now - value.timestamp < CACHE_TTL) {
					validCache[key] = value;
				}
			}
			return validCache;
		}
	} catch (error) {
		logger.warn('Analysis cache load failed', error);
	}
	return {};
}

function saveAnalysisCache(cache) {
	if (typeof localStorage === 'undefined') return;

	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
	} catch (error) {
		logger.warn('Analysis cache save failed', error);
	}
}

function createAnalysisCacheKey(place) {
	return place.title;
}

let analysisCache = loadAnalysisCache();
let lastAnalysisCacheStats = { cached: 0, uncached: 0, total: 0 };

export function clearAnalysisCache() {
	// Clear localStorage
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(CACHE_KEY);
	}
	// Clear in-memory cache
	analysisCache = {};
	logger.info('Analysis cache cleared');
}

export function getLastAnalysisCacheStats() {
	return lastAnalysisCacheStats;
}

async function analyzeSinglePlace(place, preferences) {
	const instructions = `You are a chat assistant helping a user analyze places:
(1) To classify them
(2) To assign labels to them
(3) To rate them based on their impact and importance to the user's environment

Available CLASSES are:
${Object.keys(CLASSES)
	.map((classLabel) => `- ${classLabel}: ${CLASSES[classLabel].description}`)
	.join('\n')}
        
Available LABELS are:
${LABELS.map((label) => `- ${label.value}: ${label.description}`).join('\n')}

Available IMPORTANCE values are:
1: very low
2: low
3: medium
4: high
5: very high

Aspects that contribute to HIGHER IMPORTANCE are:
* the place is a landmark or a famous building
* the place is unique in the area
* the place is of historical or cultural significance
* the place is related to a well - known person or event
* the place is characteristic for the area
* the place dominates the perceived environment (e.g., a skyscraper, a castle, a park)
* the place is a named, substantial geographic feature that shapes the local environment (e.g., a river, a lake, a mountain)

Aspects that contribute to LOWER IMPORTANCE are:
* the place is a generic business or a shop
* the place is a detail of a larger place
* the place is a larger administrative area not directly perceived at the user's location (e.g., a city, a district, a region)
* the place is a generic entity (e.g., a concept, a non-physical object)
* the place is maybe just an office of a business or intitution
* the place has vanished or is not accessible anymore
* the place is built over or is not visible anymore

To best best characterize the place answer with 
* exactly one class,
* up to three labels, and
* one importance value.

For a place "A" and its description output a JSON object like this:

{
    "cls": "CLASS1",
    "labels": ["LABEL1", "LABEL2"],
    "importance": 5
}
    
FURTHER INSTRUCTIONS:
* Do not rate named rivers, lakes, mountains, or similar physical geography as low importance merely because they extend across multiple locations or can be accessed elsewhere.
* A considerable named river near the user should usually be classified as "WATERBODY", labeled with "GEOGRAPHY", and rated high importance because it shapes landscape, settlement pattern, movement, views, ecology, or local identity.
* Broad administrative or abstract geographic areas should still have low importance unless they physically define what the user can perceive or experience at the current location.
`;
	const distanceText = Number.isFinite(place.dist) ? `, distance: ${Math.round(place.dist)}m` : '';
	const dataString = `* ${place.title} (${place.type || 'unknown'}${distanceText}): ${place.snippet || place.description || ''}`;
	const model = getAiModel('simple', preferences);
	const response = await withPerformance(
		'ai.analysis.place',
		() =>
			openai.responses.create({
				model,
				reasoning: {
					effort: AI_REASONING_EFFORT
				},
				input: [
					{
						role: 'system',
						content: instructions
					},
					{
						role: 'user',
						content: dataString
					}
				],
				text: {
					format: {
						type: 'json_object'
					}
				}
			}),
		{ title: place.title, model }
	);
	let json;
	try {
		// Extract JSON from response, handling potential extra text
		const text = response.output_text.trim();
		const jsonStart = text.indexOf('{');
		const jsonEnd = text.lastIndexOf('}') + 1;
		const jsonText =
			jsonStart !== -1 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd) : text;
		json = JSON.parse(jsonText);
	} catch (parseError) {
		logger.error('Analysis response parse failed', {
			title: place.title,
			responseText: response.output_text,
			error: parseError
		});
		// Fallback to empty analysis
		json = { cls: 'other', labels: [], importance: 0 };
	}
	// update cache with timestamp and save to localStorage
	const cacheKey = createAnalysisCacheKey(place);
	analysisCache[cacheKey] = {
		...json,
		timestamp: Date.now()
	};
	saveAnalysisCache(analysisCache);
}

export async function analyzePlaces(places, preferences) {
	logger.debug('Places before analysis', {
		count: places.length,
		places: places.map((place) => ({ title: place.title, type: place.type, lang: place.lang }))
	});
	// get places with cached analysis using improved cache key
	const placesWithoutCachedAnalysis = places.filter((place) => {
		const cacheKey = createAnalysisCacheKey(place);
		return !analysisCache[cacheKey];
	});
	lastAnalysisCacheStats = {
		cached: places.length - placesWithoutCachedAnalysis.length,
		uncached: placesWithoutCachedAnalysis.length,
		total: places.length
	};
	logger.info('Cache summary', lastAnalysisCacheStats);

	if (placesWithoutCachedAnalysis.length > 0) {
		logger.info('Analyzing uncached places', {
			uncached: placesWithoutCachedAnalysis.length,
			total: places.length
		});
		// analyze each place separately, but concurrently
		await Promise.all(
			placesWithoutCachedAnalysis.map((place) => analyzeSinglePlace(place, preferences))
		);
	} else {
		logger.info('All places found in cache', { total: places.length });
	}

	const newPlaces = places.map((place) => {
		const cacheKey = createAnalysisCacheKey(place);
		const cached = analysisCache[cacheKey];
		return {
			...place,
			labels: cached?.labels,
			cls: cached?.cls,
			importance: cached?.importance
		};
	});

	// remove non-geographic classes
	const nonGeoClasses = Object.keys(CLASSES).filter((classLabel) => CLASSES[classLabel]?.nonGeo);
	return newPlaces.filter((place) => !nonGeoClasses.includes(place.cls));
}
