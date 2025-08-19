import {
	placesHere,
	coordinates,
	preferences,
	placesSurrounding
} from '../stores.js';
import { get } from 'svelte/store';
import { openai, getAiModel } from './ai-core.js';

// extract and list historic events
export async function extractHistoricEvents() {
	let relevantPlaces = get(placesHere).filter((place) => place.stars > 2);
	if (relevantPlaces.length < 2) {
		relevantPlaces.push(...get(placesSurrounding));
	}
	const instructions = `You are a chat assistant helping a user to extract historic events for nearby places.

Extract and list historic events from the following text descring nearby places. 

Put more emphasis on higher rated places. Answer in language '${get(preferences).lang}'.

${relevantPlaces
		.map(
			(place) =>
				`# ${place.title}: ${place.labels?.join(', ')}
Rating: ${place.stars}` +
				`${place.article || place.description || place.snippet || place.type || ''}`
		)
		.join('\n\n')}

Only output a list of events in ascending temporal in JSON format.If events refer to a time range, translate the range to the start year of the range("year"), but give the range description in "date_string".Years BC should be negative.

Skip events if they are not immediately relevant for the specific, narrower place, especially early events from stone age, middle ages, or similar.Prefer truely local events of the very specific place, over those that affect the whole town or region.

        Remember, the user is at this position:
${get(coordinates).address}
                
If the list of places is empty or the text is too short, leave the list of events empty.
`;
	console.log('Historic events instructions', [instructions]);
	const response = await openai.responses.create({
		model: getAiModel('advanced'),
		input: [
			{
				role: 'system',
				content: instructions
			}
		],
		text: {
			format: {
				type: 'json_schema',
				name: 'event',
				schema: {
					type: 'object',
					properties: {
						events: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									year: { type: 'number' },
									date_string: { type: 'string' },
									text: { type: 'string' }
								},
								required: ['year', 'date_string', 'text'],
								additionalProperties: false
							}
						}
					},
					required: ['events'],
					additionalProperties: false
				}
			}
		}
	});
	console.log('Historic events response:', response.output_text);
	return JSON.parse(response.output_text).events;
}