import { openai, getAiModel } from './ai-core.js';
import { getWikidataContext } from './wikidata.js';
import { AI_REASONING_EFFORT } from '../constants.js';

const INSIGHTS_CACHE_KEY = 'urban-wanderer-insights-cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadInsightsCache() {
	if (typeof localStorage === 'undefined') return {};
	
	try {
		const stored = localStorage.getItem(INSIGHTS_CACHE_KEY);
		if (stored) {
			const cache = JSON.parse(stored);
			const now = Date.now();
			// Clean expired entries and return valid ones
			const validCache = {};
			for (const [key, value] of Object.entries(cache)) {
				if (value.timestamp && (now - value.timestamp < CACHE_TTL)) {
					validCache[key] = value;
				}
			}
			return validCache;
		}
	} catch (error) {
		console.warn('Failed to load insights cache:', error);
	}
	return {};
}

function saveInsightsCache(cache) {
	if (typeof localStorage === 'undefined') return;
	
	try {
		localStorage.setItem(INSIGHTS_CACHE_KEY, JSON.stringify(cache));
	} catch (error) {
		console.warn('Failed to save insights cache:', error);
	}
}

function createInsightsCacheKey(article, preferences) {
	// Create a cache key based on article content and language
	const articleHash = article.slice(0, 100); // First 100 chars as identifier
	return `${articleHash}|${preferences.lang}`;
}

let insightsCache = loadInsightsCache();

export function clearInsightsCache() {
	// Clear localStorage
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(INSIGHTS_CACHE_KEY);
	}
	// Clear in-memory cache
	insightsCache = {};
	console.log('Insights cache cleared (both localStorage and memory)');
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

// search for a data facts about a place
export async function searchPlaceFacts(place, factsProperties, coordinates, preferences) {
	// Get WikiData context using the new utility
	const wikidataContext = await getWikidataContext(place);

	const initialMessage = `
You are a chat assistant helping a user to find facts about a place in the provided JSON format.

The place of interest is ${place.title} (${place.cls}) located near ${coordinates.address}. 

Extract and search for relevant facts and data about the place. Answer in language '${preferences.lang}'.

The facts should be relevant for a current touristic visitor of the place. 
Avoid redundancies; do not repeat the same information in different ways in properties and other facts.
Directions, address, location are not necessary as the user is at the place already. 
Avoid any general description of the place and do not provide general information about the city or region. 
Use null for missing values.
Keep the language as concise as possible and factual, do not use acronyms or abbreviations. 
Descriptions should not be full sentences, but short phrases or single words.
Use unicode icons for properties where possible, e.g., 🏛️ for "building", 🏞️ for "park", etc.
Keep list short or empty if there are no relevant facts.

You may use the following sources of information about the place:
${place.article || place.description || place.snippet || '[no description available]'}${wikidataContext}
`;
	console.log('Search facts instructions', [initialMessage]);
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
	console.log('Search fact response:', JSON.parse(response.output_text).facts);
	return JSON.parse(response.output_text).facts;
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
