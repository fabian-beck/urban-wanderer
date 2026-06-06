import { openai, getAiModel } from './ai-core.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';
import {
	HISTORY_BROAD_ADDRESS_PART_KEYS,
	HISTORY_LOCAL_ADDRESS_PART_KEYS,
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

function getPlaceSummaryText(place) {
	return [place.description, place.snippet, place.type].filter(Boolean).join('\n');
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

function normalizePlaceMatchText(value) {
	return String(value || '')
		.normalize('NFKC')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

function getPlaceTitleVariants(title) {
	const normalizedTitle = normalizePlaceMatchText(title);
	const withoutParenthetical = normalizePlaceMatchText(
		normalizedTitle.replace(/\s*\([^)]*\)\s*$/, '')
	);
	return new Set([normalizedTitle, withoutParenthetical].filter(Boolean));
}

function placeMatchesAddressPart(place, coordinates, key) {
	const addressValue = normalizePlaceMatchText(coordinates?.[key]);
	if (!addressValue) {
		return false;
	}
	return [...getPlaceTitleVariants(place.title)].some((title) => title === addressValue);
}

function placeMatchesAnyAddressPart(place, coordinates, keys) {
	return keys.some((key) => placeMatchesAddressPart(place, coordinates, key));
}

function getLocationSpecificity(coordinates) {
	const hasRoad = Boolean(coordinates?.road);
	const hasSuburb = Boolean(coordinates?.suburb);
	const hasTown = Boolean(coordinates?.town);
	const hasVillage = Boolean(coordinates?.village);

	if (hasSuburb && hasTown) {
		return 'specific quarter or suburb within a larger city';
	}
	if (hasRoad && hasTown) {
		return 'street-level position within a town or city';
	}
	if (hasVillage) {
		return 'village-level location';
	}
	if (hasTown) {
		return 'town or city-level location with limited narrower context';
	}
	return 'location with limited address granularity';
}

function formatAddressParts(coordinates) {
	const addressParts = [
		['road', coordinates?.road],
		['suburb/quarter', coordinates?.suburb],
		['village', coordinates?.village],
		['town/city', coordinates?.town],
		['county', coordinates?.county],
		['state', coordinates?.state],
		['country', coordinates?.country]
	].filter(([, value]) => value);

	if (addressParts.length === 0) {
		return '- no structured address parts available';
	}

	return addressParts.map(([label, value]) => `- ${label}: ${value}`).join('\n');
}

function getContextPlaceBlock(place, { includeFullText = true } = {}) {
	const text = includeFullText ? getPlaceText(place) : getPlaceSummaryText(place);
	return `## ${place.title}: ${place.labels?.join(', ') || 'no labels'}
Rating: ${place.stars || 0}
Distance: ${Number.isFinite(place.dist) ? Math.round(place.dist) + ' m' : 'unknown'}
${text}`;
}

function formatContextTier(title, places, options) {
	if (places.length === 0) {
		return `# ${title}\nNo places available.`;
	}
	return `# ${title}\n${places.map((place) => getContextPlaceBlock(place, options)).join('\n\n')}`;
}

function getHistoryContext(placesHere, placesNearby, placesSurrounding, coordinates) {
	let remainingPlaces = HISTORY_MAX_CONTEXT_PLACES;
	const immediatePlaces = uniquePlaces(placesHere)
		.filter((place) => (place.stars || 0) > 2 || getPlaceText(place))
		.sort(compareHistoryContextPriority)
		.slice(0, remainingPlaces);
	remainingPlaces -= immediatePlaces.length;

	const localSurroundingPlaces = uniquePlaces(placesSurrounding)
		.filter((place) =>
			placeMatchesAnyAddressPart(place, coordinates, HISTORY_LOCAL_ADDRESS_PART_KEYS)
		)
		.filter((place) => (place.stars || 0) > 2 || getPlaceText(place))
		.sort(compareHistoryContextPriority)
		.slice(0, remainingPlaces);
	remainingPlaces -= localSurroundingPlaces.length;

	const primaryPlaces = uniquePlaces([...immediatePlaces, ...localSurroundingPlaces]);
	const primaryPlacesWithContext = primaryPlaces.filter((place) => getPlaceText(place));
	const fallbackPlaces = uniquePlaces(placesNearby)
		.filter((place) => getPlaceText(place))
		.sort(compareHistoryContextPriority)
		.slice(0, Math.min(HISTORY_NEARBY_FALLBACK_LIMIT, Math.max(remainingPlaces, 0)));
	const needsFallback = primaryPlaces.length < HISTORY_MIN_CONTEXT_PLACES;
	const lacksTextContext = primaryPlacesWithContext.length < HISTORY_MIN_CONTEXT_PLACES;
	const nearbyFallbackPlaces = needsFallback || lacksTextContext ? fallbackPlaces : [];
	remainingPlaces -= nearbyFallbackPlaces.length;

	const broadSurroundingPlaces = uniquePlaces(placesSurrounding)
		.filter((place) =>
			placeMatchesAnyAddressPart(place, coordinates, HISTORY_BROAD_ADDRESS_PART_KEYS)
		)
		.filter((place) => getPlaceText(place))
		.sort(compareHistoryContextPriority)
		.slice(0, Math.max(remainingPlaces, 0));

	return {
		immediatePlaces,
		localSurroundingPlaces,
		broadSurroundingPlaces,
		nearbyFallbackPlaces,
		placesForLogging: uniquePlaces([
			...immediatePlaces,
			...localSurroundingPlaces,
			...broadSurroundingPlaces,
			...nearbyFallbackPlaces
		]).slice(0, HISTORY_MAX_CONTEXT_PLACES)
	};
}

// extract and list historic events
export async function extractHistoricEvents(
	placesHere,
	placesNearby,
	placesSurrounding,
	coordinates,
	preferences
) {
	const historyContext = getHistoryContext(
		placesHere,
		placesNearby,
		placesSurrounding,
		coordinates
	);
	const isCityQuarter = Boolean(coordinates?.suburb && coordinates?.town);
	const instructions = `You are a chat assistant helping a user to extract historic events for nearby places.

Extract and list historic events from the following location context.

Answer in language '${preferences.lang}'.

# Current position
${coordinates.address}

# Structured address parts
${formatAddressParts(coordinates)}

# Location specificity
The user is at a ${getLocationSpecificity(coordinates)}.
${isCityQuarter ? 'Because suburb/quarter and town/city are both present, city-wide events are background only and should usually be excluded.' : 'If the address indicates a small village and no narrower place evidence exists, village-level events may count as local.'}

${formatContextTier(
	'Tier 1: immediate location and places physically at the user position',
	historyContext.immediatePlaces
)}

${formatContextTier(
	'Tier 2: named enclosing local area, such as street, quarter, suburb, or village',
	historyContext.localSurroundingPlaces
)}

${formatContextTier('Tier 3: nearby fallback places', historyContext.nearbyFallbackPlaces)}

${formatContextTier(
	'Tier 4: broader administrative context, such as city, county, state, or country',
	historyContext.broadSurroundingPlaces,
	{ includeFullText: false }
)}

Only output a list of events in ascending temporal in JSON format. If events refer to a time range, translate the range to the start year of the range ("year"), but give the range description in "date_string". Years BC should be negative.

Use the context tiers in this strict order:
1. Tier 1: immediate location and places physically at the user position.
2. Tier 2: named enclosing local area, such as street, quarter, suburb, or village.
3. Tier 3: nearby fallback places, only if Tier 1 and Tier 2 have no usable historic events.
4. Tier 4: broader administrative context, only to disambiguate Tier 1 or Tier 2.

Broad administrative places are context labels, not event sources. Do not mine their full history unless the event explicitly mentions a Tier 1 or Tier 2 place.

Only include an event if it passes one of these tests:
1. It happened at a Tier 1 place.
2. It explicitly names or directly concerns the current street, building, quarter, suburb, or village.
3. It concerns a nearby place within walking distance and is more locally specific than the city as a whole.

Reject events that only concern the whole city, region, country, dynasty, war, or general historical era, unless the user is in a small village or town and no narrower evidence is available.
Skip events if they are not immediately relevant for the specific, narrower place, especially early events from stone age, middle ages, or similar.
Prefer returning an empty list over filling the result with broad city history.
If only broad city-level history is available for a quarter of a larger city, return an empty list.
If the list of local and fallback places is empty or the text is too short, leave the list of events empty.
`;
	logger.info('Extracting historic events', {
		places: historyContext.placesForLogging.length,
		immediate: historyContext.immediatePlaces.length,
		local: historyContext.localSurroundingPlaces.length,
		broad: historyContext.broadSurroundingPlaces.length,
		fallback: historyContext.nearbyFallbackPlaces.length
	});
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
