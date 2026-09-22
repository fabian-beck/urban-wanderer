import {
	PLACE_HIGH_RATED_MIN_STARS,
	WALK_EVENTS_PER_STOP,
	WALK_MAX_AGE_MS,
	WALK_PASSED_PLACES_PER_STOP,
	WALK_RECAP_MISSED_PLACES_LIMIT,
	WALK_RECAP_STORY_EXCERPT_LENGTH,
	WALK_RESUME_DISTANCE,
	WALK_SNAPSHOT_TEXT_LENGTH,
	WALK_STOP_MERGE_DISTANCE,
	WALK_STORY_CONTEXT_LIMIT,
	WALK_STORY_CONTEXT_MAX_CHARS,
	WALK_STORY_EXCERPT_LENGTH,
	WALK_VISITED_CONTEXT_LIMIT
} from '../constants/core.js';
import { LABELS } from '../constants/ui-config.js';
import { haversineDistance } from './osm.js';
import { getPlaceIdentity } from './place-identity.js';

export function createWalk() {
	return {
		id: `walk-${Date.now()}`,
		startedAt: Date.now(),
		stops: [],
		visitedPlaces: [],
		stories: [],
		recap: null
	};
}

export function getWalkLastActivity(walk) {
	const lastStop = walk?.stops?.[walk.stops.length - 1];
	return lastStop?.at || walk?.startedAt || 0;
}

// A walk stays active until it is replaced or its last stop is older than WALK_MAX_AGE_MS
export function isWalkActive(walk) {
	return Boolean(walk && Date.now() - getWalkLastActivity(walk) < WALK_MAX_AGE_MS);
}

// Distance from the given position to the last stop when the walk can be continued from there
export function getWalkResumeDistance(walk, position) {
	if (!isWalkActive(walk) || walk.stops.length === 0 || !position) {
		return null;
	}
	const distance = getStopDistance(walk.stops[walk.stops.length - 1], position);
	return distance <= WALK_RESUME_DISTANCE ? distance : null;
}

// Identifies the walk state a recap was generated for
export function getWalkRecapKey(walk) {
	return `${walk?.stops?.length || 0}:${walk?.stories?.length || 0}`;
}

function getStopDistance(stop, coordinates) {
	return haversineDistance(
		stop.latitude,
		stop.longitude,
		coordinates.latitude,
		coordinates.longitude
	);
}

export function truncate(text, maxLength) {
	const normalized = String(text || '')
		.replace(/\s+/g, ' ')
		.trim();
	return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

// Best available factual text about a place; insights are preferred because they are already condensed
function getPlaceSnapshotText(place) {
	return truncate(
		place.insights || place.description || place.snippet || '',
		WALK_SNAPSHOT_TEXT_LENGTH
	);
}

function toVisitedPlace(place, stopIndex, at) {
	return {
		identity: getPlaceIdentity(place),
		title: place.title,
		cls: place.cls,
		labels: place.labels || [],
		stars: place.stars || 0,
		lat: place.lat,
		lon: place.lon,
		wikidata: place.wikidata || null,
		pageid: place.pageid || null,
		lang: place.lang || null,
		wikipedia: place.wikipedia || null,
		imageThumb: place.imageThumb || null,
		text: getPlaceSnapshotText(place),
		hasInsights: Boolean(place.insights),
		firstStopIndex: stopIndex,
		lastStopIndex: stopIndex,
		firstVisitedAt: at,
		visits: 1
	};
}

function toPassedPlace(place) {
	return {
		identity: getPlaceIdentity(place),
		title: place.title,
		cls: place.cls,
		labels: place.labels || [],
		stars: place.stars || 0,
		dist: Number.isFinite(place.dist) ? Math.round(place.dist) : null,
		text: truncate(place.description || place.snippet || '', WALK_SNAPSHOT_TEXT_LENGTH / 2)
	};
}

// High-rated nearby places the user did not reach at this stop
function selectPassedPlaces(nearbyPlaces, herePlaces) {
	const hereIdentities = new Set(herePlaces.map((place) => getPlaceIdentity(place)));
	return [...nearbyPlaces]
		.filter(
			(place) =>
				(place.stars || 0) >= PLACE_HIGH_RATED_MIN_STARS &&
				!hereIdentities.has(getPlaceIdentity(place))
		)
		.sort((a, b) => (a.dist || Infinity) - (b.dist || Infinity))
		.slice(0, WALK_PASSED_PLACES_PER_STOP)
		.map(toPassedPlace);
}

function toStop(coordinates, at) {
	return {
		at,
		latitude: coordinates.latitude,
		longitude: coordinates.longitude,
		address: coordinates.address,
		road: coordinates.road,
		suburb: coordinates.suburb,
		town: coordinates.town,
		village: coordinates.village,
		placeIdentities: [],
		passedPlaces: [],
		comment: '',
		events: []
	};
}

// Records the current position, its "here" places, and passed-by nearby places; a position close to the last stop extends that stop
export function addWalkStop(walk, coordinates, herePlaces = [], nearbyPlaces = []) {
	if (!isWalkActive(walk) || !coordinates) {
		return walk;
	}
	const at = Date.now();
	const stops = [...walk.stops];
	const lastStop = stops[stops.length - 1];
	const mergeIntoLastStop =
		lastStop && getStopDistance(lastStop, coordinates) < WALK_STOP_MERGE_DISTANCE;
	const stopIndex = mergeIntoLastStop ? stops.length - 1 : stops.length;
	const stop = mergeIntoLastStop
		? { ...lastStop, placeIdentities: [...lastStop.placeIdentities] }
		: toStop(coordinates, at);
	stop.passedPlaces = selectPassedPlaces(nearbyPlaces, herePlaces);
	const visitedPlaces = walk.visitedPlaces.map((place) => ({ ...place }));

	for (const place of herePlaces) {
		const identity = getPlaceIdentity(place);
		if (!identity) {
			continue;
		}
		if (!stop.placeIdentities.includes(identity)) {
			stop.placeIdentities.push(identity);
		}
		const visited = visitedPlaces.find((candidate) => candidate.identity === identity);
		if (!visited) {
			visitedPlaces.push(toVisitedPlace(place, stopIndex, at));
		} else if (visited.lastStopIndex !== stopIndex) {
			visited.lastStopIndex = stopIndex;
			visited.visits += 1;
		}
	}
	stops[stopIndex] = stop;
	return { ...walk, stops, visitedPlaces };
}

// Copies texts and thumbnails that arrived after a stop was recorded into the visited place snapshots
export function enrichWalkPlaces(walk, places = []) {
	if (!isWalkActive(walk) || !places?.length) {
		return walk;
	}
	const currentByIdentity = new Map(places.map((place) => [getPlaceIdentity(place), place]));
	let changed = false;
	const visitedPlaces = walk.visitedPlaces.map((visited) => {
		const current = currentByIdentity.get(visited.identity);
		if (!current) {
			return visited;
		}
		const updated = { ...visited };
		if (current.insights && !visited.hasInsights) {
			updated.text = getPlaceSnapshotText(current);
			updated.hasInsights = true;
		} else if (!visited.text) {
			updated.text = getPlaceSnapshotText(current);
		}
		if (current.imageThumb && !visited.imageThumb) {
			updated.imageThumb = current.imageThumb;
		}
		if (updated.text !== visited.text || updated.imageThumb !== visited.imageThumb) {
			changed = true;
			return updated;
		}
		return visited;
	});
	return changed ? { ...walk, visitedPlaces } : walk;
}

function updateLastStop(walk, update) {
	if (!isWalkActive(walk) || walk.stops.length === 0) {
		return walk;
	}
	const stops = [...walk.stops];
	const lastIndex = stops.length - 1;
	stops[lastIndex] = { ...stops[lastIndex], ...update };
	return { ...walk, stops };
}

export function addWalkComment(walk, comment) {
	const text = truncate(comment, WALK_SNAPSHOT_TEXT_LENGTH / 2);
	if (!text || walk?.stops?.[walk.stops.length - 1]?.comment === text) {
		return walk;
	}
	return updateLastStop(walk, { comment: text });
}

export function addWalkEvents(walk, events) {
	if (!Array.isArray(events) || events.length === 0) {
		return walk;
	}
	const compact = events.slice(0, WALK_EVENTS_PER_STOP).map((event) => ({
		year: event.year,
		date_string: event.date_string,
		text: truncate(event.text, WALK_SNAPSHOT_TEXT_LENGTH / 2)
	}));
	const lastStop = walk?.stops?.[walk.stops.length - 1];
	if (lastStop && JSON.stringify(lastStop.events) === JSON.stringify(compact)) {
		return walk;
	}
	return updateLastStop(walk, { events: compact });
}

// Passed-by places across the whole walk that never became a "here" place
export function getPassedPlaces(walk) {
	if (!walk) {
		return [];
	}
	const visitedIdentities = new Set(walk.visitedPlaces.map((place) => place.identity));
	const byIdentity = new Map();
	walk.stops.forEach((stop, stopIndex) => {
		(stop.passedPlaces || []).forEach((place) => {
			if (visitedIdentities.has(place.identity)) {
				return;
			}
			const existing = byIdentity.get(place.identity);
			if (!existing || (place.dist ?? Infinity) < (existing.dist ?? Infinity)) {
				byIdentity.set(place.identity, { ...place, stopIndex });
			}
		});
	});
	return [...byIdentity.values()]
		.sort((a, b) => b.stars - a.stars || (a.dist ?? Infinity) - (b.dist ?? Infinity))
		.slice(0, WALK_RECAP_MISSED_PLACES_LIMIT);
}

export function getStoryHeadline(text) {
	const trimmed = String(text || '').trim();
	const boldHeadline = trimmed.match(/^\*\*(.+?)\*\*/);
	if (boldHeadline) {
		return boldHeadline[1].trim();
	}
	const firstSentence = trimmed.split(/(?<=[.!?])\s/)[0] || '';
	return firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence;
}

function getStoryBody(text) {
	return String(text || '')
		.trim()
		.replace(/^\*\*(.+?)\*\*\s*/, '')
		.replace(/\s+/g, ' ');
}

function getStoryExcerpt(text, maxLength) {
	const body = getStoryBody(text);
	return body.length > maxLength ? `${body.slice(0, maxLength - 3)}...` : body;
}

// Remembers a story part the user has read at the current stop
export function addWalkStory(walk, text) {
	if (!isWalkActive(walk) || !text || walk.stories.some((story) => story.text === text)) {
		return walk;
	}
	const stopIndex = Math.max(walk.stops.length - 1, 0);
	const stop = walk.stops[stopIndex];
	return {
		...walk,
		stories: [
			...walk.stories,
			{
				at: Date.now(),
				stopIndex,
				address: stop?.address || '',
				headline: getStoryHeadline(text),
				text
			}
		]
	};
}

// Places that were "here" at an earlier stop than the current one
export function getPreviouslyVisitedIdentities(walk) {
	if (!isWalkActive(walk) || walk.stops.length < 2) {
		return new Set();
	}
	const currentStopIndex = walk.stops.length - 1;
	return new Set(
		walk.visitedPlaces
			.filter((place) => place.firstStopIndex < currentStopIndex)
			.map((place) => place.identity)
	);
}

export function getVisitedPlace(walk, place) {
	if (!walk) {
		return null;
	}
	const identity = getPlaceIdentity(place);
	return walk.visitedPlaces.find((visited) => visited.identity === identity) || null;
}

export function getWalkDistance(walk) {
	if (!walk) {
		return 0;
	}
	let distance = 0;
	for (let index = 1; index < walk.stops.length; index++) {
		distance += getStopDistance(walk.stops[index - 1], walk.stops[index]);
	}
	return distance;
}

export function getWalkStats(walk) {
	if (!walk) {
		return null;
	}
	return {
		durationMs: Math.max(getWalkLastActivity(walk) - walk.startedAt, 0),
		stops: walk.stops.length,
		distanceMeters: getWalkDistance(walk),
		visitedPlaces: walk.visitedPlaces.length,
		stories: walk.stories.length,
		areas: [...new Set(walk.stops.map((stop) => stop.town || stop.village).filter(Boolean))]
	};
}

export function formatWalkDuration(durationMs) {
	const totalMinutes = Math.round(durationMs / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) {
		return `${minutes} min`;
	}
	return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function formatWalkDistance(distanceMeters) {
	if (distanceMeters >= 1000) {
		return `${(distanceMeters / 1000).toFixed(1)} km`;
	}
	return `${Math.round(distanceMeters / 10) * 10} m`;
}

export function formatWalkTime(timestamp) {
	return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStopLabel(stop) {
	return [stop?.road, stop?.suburb, stop?.town || stop?.village].filter(Boolean).join(', ');
}

function formatVisitedPlaceLine(place, walk) {
	const stop = walk.stops[place.firstStopIndex];
	const labels = place.labels?.length ? ` (${place.labels.join(', ')})` : '';
	const where = stop ? `, ${formatWalkTime(place.firstVisitedAt)} at ${getStopLabel(stop)}` : '';
	return `- ${place.title}${labels}${where}`;
}

// Earlier stories in chronological order; with fullText, the most recent ones are given verbatim
// within WALK_STORY_CONTEXT_MAX_CHARS and only older ones fall back to an excerpt
function selectContextStories(walk, fullText) {
	let budget = WALK_STORY_CONTEXT_MAX_CHARS;
	return walk.stories
		.slice(-WALK_STORY_CONTEXT_LIMIT)
		.reverse()
		.map((story) => {
			const text = String(story.text || '').trim();
			if (fullText && text.length <= budget) {
				budget -= text.length;
				return { ...story, full: true, contextText: text };
			}
			return {
				...story,
				full: false,
				contextText: getStoryExcerpt(text, WALK_STORY_EXCERPT_LENGTH)
			};
		})
		.reverse();
}

function formatStoryContext(story, currentStopIndex, fullText) {
	const where = `stop ${story.stopIndex + 1}${story.stopIndex === currentStopIndex ? ', the current stop' : ''}${story.address ? `, ${story.address}` : ''}`;
	if (fullText) {
		return `## Story told at ${where}${story.full ? '' : ' (excerpt only)'}

${story.contextText}`;
	}
	return `- ${story.headline ? `"${story.headline}"` : 'Untitled'} (told at ${where}): ${story.contextText}`;
}

// Prompt context describing the walk so far; empty when nothing has been recorded before yet.
// With fullStories, the earlier stories are quoted verbatim so the model can avoid repeating them.
export function buildWalkPromptContext(walk, { fullStories = false } = {}) {
	if (!isWalkActive(walk) || (walk.stops.length < 2 && walk.stories.length === 0)) {
		return '';
	}
	const stats = getWalkStats(walk);
	const currentStopIndex = walk.stops.length - 1;
	const earlierPlaces = walk.visitedPlaces
		.filter((place) => place.firstStopIndex < currentStopIndex)
		.slice(-WALK_VISITED_CONTEXT_LIMIT);
	const stories = selectContextStories(walk, fullStories);
	const sections = [
		`# The user's walk so far:

The user is on a walk that started ${formatWalkDuration(stats.durationMs)} ago, with ${stats.stops} stops and roughly ${formatWalkDistance(stats.distanceMeters)} covered${stats.areas.length ? ` in ${stats.areas.join(', ')}` : ''}.`
	];
	if (earlierPlaces.length > 0) {
		sections.push(
			`Places already visited earlier on this walk (not at the current stop):
${earlierPlaces.map((place) => formatVisitedPlaceLine(place, walk)).join('\n')}`
		);
	}
	if (stories.length > 0) {
		const storyLines = stories
			.map((story) => formatStoryContext(story, currentStopIndex, fullStories))
			.join(fullStories ? '\n\n' : '\n');
		sections.push(
			fullStories
				? `# Stories the user has already heard on this walk

The user knows every fact in the following ${stories.length === 1 ? 'story' : 'stories'} and must not hear it again.

${storyLines}

# End of the stories already heard`
				: `Stories the user has already heard on this walk (do not repeat their content):
${storyLines}`
		);
	}
	return sections.join('\n\n');
}

// Full walk material for the recap: stops with comments and events, place snapshots, passed-by places, stories
export function buildWalkRecapContext(walk, preferences = {}) {
	if (!walk) {
		return '';
	}
	const stats = getWalkStats(walk);
	const selectedLabels = preferences.labels || [];
	const interestNames = LABELS.filter((label) => selectedLabels.includes(label.value)).map(
		(label) => label.value
	);
	const placeByIdentity = new Map(walk.visitedPlaces.map((place) => [place.identity, place]));
	const stopBlocks = walk.stops.map((stop, index) => {
		const placeTitles = stop.placeIdentities
			.map((identity) => placeByIdentity.get(identity)?.title)
			.filter(Boolean);
		const lines = [
			`## Stop ${index + 1}, ${formatWalkTime(stop.at)}: ${getStopLabel(stop) || stop.address || 'unknown position'}`,
			`Places here: ${placeTitles.join(', ') || 'none'}`
		];
		if (stop.comment) {
			lines.push(`Guide's comment at this stop: ${stop.comment}`);
		}
		if (stop.events?.length) {
			lines.push(
				`Historic events extracted at this stop:\n${stop.events
					.map((event) => `- ${event.date_string || event.year}: ${event.text}`)
					.join('\n')}`
			);
		}
		return lines.join('\n');
	});
	const placeBlocks = walk.visitedPlaces.map((place) => {
		const stop = walk.stops[place.firstStopIndex];
		return `## ${place.title}${place.labels?.length ? ` (${place.labels.join(', ')})` : ''}
Rating: ${place.stars}; first seen ${formatWalkTime(place.firstVisitedAt)}${stop ? ` at stop ${place.firstStopIndex + 1}` : ''}${place.visits > 1 ? `; seen ${place.visits} times` : ''}
${place.text || 'No further information available.'}`;
	});
	const passedPlaces = getPassedPlaces(walk);
	const sections = [
		`# Walk overview

Started ${formatWalkTime(walk.startedAt)}, duration ${formatWalkDuration(stats.durationMs)}, ${stats.stops} stops, roughly ${formatWalkDistance(stats.distanceMeters)}${stats.areas.length ? ` in ${stats.areas.join(', ')}` : ''}.
User's interests: ${interestNames.join(', ') || 'none selected'}. Familiarity with the area: ${preferences.familiarity || 'unknown'}.`,
		`# Stops in order

${stopBlocks.join('\n\n') || 'No stops recorded.'}`,
		`# Visited places

${placeBlocks.join('\n\n') || 'None.'}`,
		`# Passed-by places (high-rated, close to the route, but never reached)

${
	passedPlaces
		.map(
			(place) =>
				`- ${place.title}${place.labels?.length ? ` (${place.labels.join(', ')})` : ''}, rating ${place.stars}, about ${place.dist ?? '?'} m from stop ${place.stopIndex + 1}${place.text ? `: ${place.text}` : ''}`
		)
		.join('\n') || '- none'
}`
	];
	if (walk.stories.length > 0) {
		sections.push(
			`# Stories the user read during the walk

${walk.stories
	.map(
		(story) =>
			`## ${story.headline || 'Untitled'} (stop ${story.stopIndex + 1}${story.address ? `, ${story.address}` : ''})
${getStoryExcerpt(story.text, WALK_RECAP_STORY_EXCERPT_LENGTH)}`
	)
	.join('\n\n')}`
		);
	}
	return sections.join('\n\n');
}
