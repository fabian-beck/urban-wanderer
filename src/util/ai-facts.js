import { openai, getAiModel } from './ai-core.js';
import { getWikidataContext } from './wikidata.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';
import { INSIGHTS_CACHE_KEY, FACTS_CACHE_KEY, CACHE_TTL } from '../constants/cache-config.js';

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
		console.warn(`Failed to load cache ${cacheKey}:`, error);
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
		console.warn(`Failed to save cache ${cacheKey}:`, error);
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
	console.log('Insights cache cleared (both localStorage and memory)');
}

export function clearFactsCache() {
	// Clear localStorage
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(FACTS_CACHE_KEY);
	}
	// Clear in-memory cache
	factsCache = {};
	console.log('Facts cache cleared (both localStorage and memory)');
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
		console.log('Facts found in cache for place:', place.title);
		return factsCache[cacheKey].content;
	}

	console.log('Generating new facts for place:', place.title);
	// Get WikiData context using the new utility
	const wikidataContext = await getWikidataContext(place);

	const initialMessage = `
You are a chat assistant helping a user to find facts about a place in the provided JSON format.

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
	console.log('Extract facts instructions', [initialMessage]);
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
	console.log('Extract facts response:', facts);

	// Cache the result with timestamp
	factsCache[cacheKey] = {
		content: facts,
		timestamp: Date.now()
	};
	saveFactsCache(factsCache);

	return facts;
}

export async function extractInsightsFromArticle(article, preferences) {
	const cacheKey = createInsightsCacheKey(article, preferences);

	// Check cache first
	if (insightsCache[cacheKey]) {
		console.log('Insights found in cache for article');
		return insightsCache[cacheKey].content;
	}

	console.log('Generating new insights for article');
	const instructions = `You are a chat assistant helping a user to extract insights from an article, relevant when visiting the place.

Return a list of bullet points, focusing on the most important insights. 
Answer in language '${preferences.lang}'.    
`;
	console.log('Extract insights instructions', [instructions]);
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
	console.log('Extract insights response:', [insights]);

	// Cache the result with timestamp
	insightsCache[cacheKey] = {
		content: insights,
		timestamp: Date.now()
	};
	saveInsightsCache(insightsCache);

	return insights;
}
