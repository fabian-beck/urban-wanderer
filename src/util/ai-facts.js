import { openai, getAiModel } from './ai-core.js';
import { getWikidataContext } from './wikidata.js';
import { AI_REASONING_EFFORT } from '../constants.js';

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
	console.log('Extract insights response:', [response.output_text]);
	return response.output_text;
}
