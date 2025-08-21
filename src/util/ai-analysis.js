import { LABELS, AI_REASONING_EFFORT } from '../constants/ui-config.js';
import { CLASSES } from '../constants/place-classes.js';
import { openai, getAiModel } from './ai-core.js';
import { ANALYSIS_CACHE_KEY as CACHE_KEY, CACHE_TTL } from '../constants/cache-config.js';

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
		console.warn('Failed to load analysis cache:', error);
	}
	return {};
}

function saveAnalysisCache(cache) {
	if (typeof localStorage === 'undefined') return;

	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
	} catch (error) {
		console.warn('Failed to save analysis cache:', error);
	}
}

function createAnalysisCacheKey(place) {
	return place.title;
}

let analysisCache = loadAnalysisCache();

export function clearAnalysisCache() {
	// Clear localStorage
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(CACHE_KEY);
	}
	// Clear in-memory cache
	analysisCache = {};
	console.log('Analysis cache cleared (both localStorage and memory)');
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

Aspects that contribute to HIGER IMPORTANCE are:
* the place is a landmark or a famous building
* the place is unique in the area
* the place is of historical or cultural significance
* the place is related to a well - known person or event
* the place is characteristic for the area
* the place dominates the perceived environment (e.g., a skyscraper, a castle, a park)

Aspects that contribute to LOWER IMPORTANCE are:
* the place is a generic business or a shop
* the place is a detail of a larger place
* the place is a larger area (e.g., a city, a district, a region)
* the place is a larger geographic feature (e.g., a river, a lake, a mountain)
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
* Geographic places like rivers or lakes, that are not a specific location, should be labeled only as "GEOGRAPHY" and have a very low importance as they can be accessed from many locations.
`;
	const dataString = `* ${place.title}  (${place.type || ''}): ${place.snippet || place.description || ''}`;
	const response = await openai.responses.create({
		model: getAiModel('simple', preferences),
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
	});
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
		console.error('JSON parse error for place:', place.title);
		console.error('Response text:', response.output_text);
		console.error('Parse error:', parseError);
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
	console.log('Places before analysis:', places);
	// get places with cached analysis using improved cache key
	const placesWithoutCachedAnalysis = places.filter((place) => {
		const cacheKey = createAnalysisCacheKey(place);
		return !analysisCache[cacheKey];
	});

	if (placesWithoutCachedAnalysis.length > 0) {
		console.log(`Analyzing ${placesWithoutCachedAnalysis.length} uncached places`);
		// analyze each place separately, but concurrently
		await Promise.all(
			placesWithoutCachedAnalysis.map((place) => analyzeSinglePlace(place, preferences))
		);
	} else {
		console.log('All places found in cache');
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
