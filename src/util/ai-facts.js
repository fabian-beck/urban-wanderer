import { openai, getAiModel } from './ai-core.js';
import { getWikidataContext } from './wikidata.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';
import { INSIGHTS_CACHE_KEY, FACTS_CACHE_KEY, CACHE_TTL } from '../constants/cache-config.js';
import { createLogger } from './logger.js';

const logger = createLogger('ai.facts');

function loadCache(cacheKey) {
	if (typeof localStorage === 'undefined') return {};

	try {
		const stored = localStorage.getItem(cacheKey);
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
		logger.warn('Cache load failed', { cacheKey, error });
	}
	return {};
}

function loadInsightsCache() {
	return loadCache(INSIGHTS_CACHE_KEY);
}

function loadFactsCache() {
	return loadCache(FACTS_CACHE_KEY);
}

function saveCache(cacheKey, cache) {
	if (typeof localStorage === 'undefined') return;

	try {
		localStorage.setItem(cacheKey, JSON.stringify(cache));
	} catch (error) {
		logger.warn('Cache save failed', { cacheKey, error });
	}
}

function saveInsightsCache(cache) {
	saveCache(INSIGHTS_CACHE_KEY, cache);
}

function saveFactsCache(cache) {
	saveCache(FACTS_CACHE_KEY, cache);
}

function createInsightsCacheKey(article, preferences) {
	// Create a cache key based on article content and language
	const articleHash = article.slice(0, 100); // First 100 chars as identifier
	return `${articleHash}|${preferences.lang}`;
}

function createFactsCacheKey(place, factsProperties, preferences) {
	// Create a cache key based on place title, properties schema, and language
	const propertiesHash = Object.keys(factsProperties).sort().join(',');
	return `${place.title}|${propertiesHash}|${preferences.lang}`;
}

let insightsCache = loadInsightsCache();
let factsCache = loadFactsCache();

export function clearInsightsCache() {
	// Clear localStorage
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(INSIGHTS_CACHE_KEY);
	}
	// Clear in-memory cache
	insightsCache = {};
	logger.info('Insights cache cleared');
}

export function clearFactsCache() {
	// Clear localStorage
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(FACTS_CACHE_KEY);
	}
	// Clear in-memory cache
	factsCache = {};
	logger.info('Facts cache cleared');
}

// summarize article
const summaryCache = {};
export async function summarizeArticle(article, preferences) {
	if (summaryCache[article]) {
		return summaryCache[article];
	}
	const response = await openai.responses.create({
		model: getAiModel('simple', preferences),
		reasoning: {
			effort: AI_REASONING_EFFORT
		},
		input: [
			{
				role: 'system',
				content: `You are a chat assistant providing a summary description for a place.

                Describe the following place in a short paragraph. Answer in language '${preferences.lang}'.
${article} `
			}
		]
	});
	const summary = response.output_text;
	summaryCache[article] = summary;
	return summary;
}

// extract facts about a place
export async function extractPlaceFacts(place, factsProperties, coordinates, preferences) {
	const cacheKey = createFactsCacheKey(place, factsProperties, preferences);

	// Check cache first
	if (factsCache[cacheKey]) {
		logger.info('Facts cache hit', { title: place.title });
		return factsCache[cacheKey].content;
	}

	logger.info('Generating facts', { title: place.title, cls: place.cls });
	// Get WikiData context using the new utility
	const wikidataContext = await getWikidataContext(place);

	const initialMessage = `
You are an assistant helping a user to find facts about a place in the provided JSON format.

The place of interest is ${place.title} (${place.cls}) located near ${coordinates.address}. 

Extract relevant facts and data about the place. Answer in language '${preferences.lang}'.

The facts should be relevant for a current touristic visitor of the place. 
Avoid redundancies and repetitions in all cases; do not repeat the same information in different ways in properties and other facts.
If a fact is already mentioned as a required property (e.g., architectural style), do not repeat as part of the list of other facts.
Directions, address, location are not necessary as the user is at the place already. 
Avoid any general description of the place and do not provide general information about the city or region. 
Use null for missing values.
Keep the language as concise as possible and factual, do not use acronyms or abbreviations. 
Descriptions should not be full sentences, but short phrases or single words.
Keep list short or empty if there are no relevant facts.

You may use the following sources of information about the place:
${place.article || place.description || place.snippet || '[no description available]'}${wikidataContext}
`;
	logger.debug('Facts prompt', { title: place.title, prompt: initialMessage });
	const response = await openai.responses.create({
		model: getAiModel('advanced', preferences),
		reasoning: {
			effort: AI_REASONING_EFFORT
		},
		input: initialMessage,
		text: {
			format: {
				type: 'json_schema',
				name: 'facts',
				schema: {
					type: 'object',
					properties: {
						facts: {
							type: 'object',
							properties: factsProperties,
							required: Object.keys(factsProperties),
							additionalProperties: false
						}
					},
					required: ['facts'],
					additionalProperties: false
				}
			}
		}
	});
	const facts = JSON.parse(response.output_text).facts;
	logger.debug('Facts response', { title: place.title, facts });

	// Clean up facts - normalize various null representations
	const cleanedFacts = {};
	for (const [key, value] of Object.entries(facts)) {
		// Handle various null representations that AI might return
		if (
			value === null ||
			value === undefined ||
			value === '.null' ||
			value === 'null' ||
			value === 'NULL' ||
			value === '.NULL' ||
			value === 'n/a' ||
			value === 'N/A' ||
			value === '' ||
			value === '.' ||
			value === '/' ||
			(typeof value === 'string' && value.trim() === '')
		) {
			cleanedFacts[key] = null;
		} else {
			cleanedFacts[key] = value;
		}
	}

	// Cache the result with timestamp
	factsCache[cacheKey] = {
		content: cleanedFacts,
		timestamp: Date.now()
	};
	saveFactsCache(factsCache);

	return cleanedFacts;
}

export async function extractInsightsFromArticle(article, preferences) {
	const cacheKey = createInsightsCacheKey(article, preferences);

	// Check cache first
	if (insightsCache[cacheKey]) {
		logger.info('Insights cache hit');
		return insightsCache[cacheKey].content;
	}

	logger.info('Generating insights', { lang: preferences.lang });
	const instructions = `You are a chat assistant helping a user to extract insights from an article, relevant when visiting the place.

Return a list of bullet points, focusing on the most important insights. 
Answer in language '${preferences.lang}'.    
`;
	logger.debug('Insights prompt', { prompt: instructions });
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
				content: article
			}
		]
	});

	const insights = response.output_text;
	logger.debug('Insights response', { insights });

	// Cache the result with timestamp
	insightsCache[cacheKey] = {
		content: insights,
		timestamp: Date.now()
	};
	saveInsightsCache(insightsCache);

	return insights;
}
