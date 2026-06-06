import { openai, getAiModel } from './ai-core.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';
import {
	HISTORY_MAX_CONTEXT_PLACES,
	HISTORY_MIN_CONTEXT_PLACES,
	HISTORY_NEARBY_FALLBACK_LIMIT
} from '../constants/core.js';
import { createLogger } from './logger.js';

const logger = createLogger('ai.history');

export function getHistoricEventKey(
	currentCoordinates,
	currentPreferences,
	here,
	nearby,
	surrounding
) {
	if (!currentCoordinates) {
		return '';
	}
	const locationKey = [
		Number(currentCoordinates.latitude).toFixed(5),
		Number(currentCoordinates.longitude).toFixed(5)
	].join(',');
	const placeKey = [...here, ...nearby, ...surrounding]
		.filter(Boolean)
		.map((place) => getPlaceIdentity(place))
		.join('|');
	return [locationKey, currentPreferences.lang, placeKey].join('|');
}

export function prepareHistoricEvents(events) {
	const sortedEvents = [...events].sort((a, b) => {
		if (a.year && b.year) {
			return a.year - b.year;
		}
		return 0;
	});

	return sortedEvents.map((event, index) => {
		if (!event.year) {
			return event;
		}
		let yearDiff = 0;
		if (index < sortedEvents.length - 1) {
			yearDiff = sortedEvents[index + 1].year - event.year;
		} else {
			yearDiff = new Date().getFullYear() - event.year;
			if (yearDiff <= 0) {
				yearDiff = 0;
			}
		}
		if (yearDiff < 0) {
			return event;
		}
		return { ...event, yearDiff };
	});
}

function getPlaceIdentity(place) {
	return place.wikidata || place.pageid || place.title;
}

function getPlaceText(place) {
	return [place.article, place.description, place.snippet, place.type].filter(Boolean).join('\n');
}

function uniquePlaces(places) {
	const seen = new Set();
	const result = [];
	for (const place of places) {
		if (!place) {
			continue;
		}
		const identity = getPlaceIdentity(place);
		if (seen.has(identity)) {
			continue;
		}
		seen.add(identity);
		result.push(place);
	}
	return result;
}

function compareHistoryContextPriority(a, b) {
	const starDiff = (b.stars || 0) - (a.stars || 0);
	if (starDiff !== 0) {
		return starDiff;
	}
	return (a.dist || Infinity) - (b.dist || Infinity);
}

function getRelevantPlaces(placesHere, placesNearby, placesSurrounding) {
	const primaryPlaces = uniquePlaces([...placesHere, ...placesSurrounding])
		.filter((place) => (place.stars || 0) > 2 || getPlaceText(place))
		.sort(compareHistoryContextPriority);
	const primaryPlacesWithContext = primaryPlaces.filter((place) => getPlaceText(place));
	const fallbackPlaces = uniquePlaces(placesNearby)
		.filter((place) => getPlaceText(place))
		.sort(compareHistoryContextPriority)
		.slice(0, HISTORY_NEARBY_FALLBACK_LIMIT);
	const needsFallback = primaryPlaces.length < HISTORY_MIN_CONTEXT_PLACES;
	const lacksTextContext = primaryPlacesWithContext.length < HISTORY_MIN_CONTEXT_PLACES;

	return uniquePlaces([
		...primaryPlaces,
		...(needsFallback || lacksTextContext ? fallbackPlaces : [])
	]).slice(0, HISTORY_MAX_CONTEXT_PLACES);
}

// extract and list historic events
export async function extractHistoricEvents(
	placesHere,
	placesNearby,
	placesSurrounding,
	coordinates,
	preferences
) {
	const relevantPlaces = getRelevantPlaces(placesHere, placesNearby, placesSurrounding);
	const instructions = `You are a chat assistant helping a user to extract historic events for nearby places.

Extract and list historic events from the following text describing nearby places. 

Put more emphasis on higher rated places. Answer in language '${preferences.lang}'.

${relevantPlaces
	.map(
		(place) =>
			`# ${place.title}: ${place.labels?.join(', ')}
Rating: ${place.stars || 0}
Distance: ${Number.isFinite(place.dist) ? Math.round(place.dist) + ' m' : 'unknown'}
${getPlaceText(place)}`
	)
	.join('\n\n')}

Only output a list of events in ascending temporal in JSON format.If events refer to a time range, translate the range to the start year of the range("year"), but give the range description in "date_string".Years BC should be negative.

Skip events if they are not immediately relevant for the specific, narrower place, especially early events from stone age, middle ages, or similar. Prefer truly local events of the very specific place, over those that affect the whole town or region.

        Remember, the user is at this position:
${coordinates.address}
                
If the list of places is empty or the text is too short, leave the list of events empty.
`;
	logger.info('Extracting historic events', { places: relevantPlaces.length });
	logger.debug('Historic events prompt', { prompt: instructions });
	const response = await openai.responses.create({
		model: getAiModel('advanced', preferences),
		reasoning: {
			effort: AI_REASONING_EFFORT
		},
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
	const events = JSON.parse(response.output_text).events;
	logger.info('Historic events extracted', { events: events.length });
	logger.debug('Historic events response', { responseText: response.output_text });
	return events;
}
