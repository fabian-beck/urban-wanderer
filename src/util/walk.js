import {
	WALK_MAX_AGE_MS,
	WALK_RECAP_STORY_EXCERPT_LENGTH,
	WALK_RESUME_DISTANCE,
	WALK_STOP_MERGE_DISTANCE,
	WALK_STORY_CONTEXT_LIMIT,
	WALK_STORY_EXCERPT_LENGTH,
	WALK_VISITED_CONTEXT_LIMIT
} from '../constants/core.js';
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

function toVisitedPlace(place, stopIndex, at) {
	return {
		identity: getPlaceIdentity(place),
		title: place.title,
		cls: place.cls,
		labels: place.labels || [],
		stars: place.stars || 0,
		lat: place.lat,
		lon: place.lon,
		firstStopIndex: stopIndex,
		lastStopIndex: stopIndex,
		firstVisitedAt: at,
		visits: 1
	};
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
		placeIdentities: []
	};
}

// Records the current position and its "here" places; a position close to the last stop extends that stop
export function addWalkStop(walk, coordinates, herePlaces = []) {
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

// Prompt context describing the walk so far; empty when there is nothing from earlier stops yet
export function buildWalkPromptContext(walk) {
	if (!isWalkActive(walk) || walk.stops.length < 2) {
		return '';
	}
	const stats = getWalkStats(walk);
	const currentStopIndex = walk.stops.length - 1;
	const earlierPlaces = walk.visitedPlaces
		.filter((place) => place.firstStopIndex < currentStopIndex)
		.slice(-WALK_VISITED_CONTEXT_LIMIT);
	const earlierStories = walk.stories.slice(-WALK_STORY_CONTEXT_LIMIT);
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
	if (earlierStories.length > 0) {
		sections.push(
			`Stories the user has already read on this walk (do not repeat their content):
${earlierStories
	.map(
		(story) =>
			`- ${story.headline ? `"${story.headline}"` : 'Untitled'}${story.address ? ` (told at ${story.address})` : ''}: ${getStoryExcerpt(story.text, WALK_STORY_EXCERPT_LENGTH)}`
	)
	.join('\n')}`
		);
	}
	return sections.join('\n\n');
}

// Full walk description for the end-of-walk recap
export function buildWalkRecapContext(walk) {
	if (!walk) {
		return '';
	}
	const stats = getWalkStats(walk);
	const stopLines = walk.stops.map((stop, index) => {
		const placeTitles = stop.placeIdentities
			.map((identity) => walk.visitedPlaces.find((place) => place.identity === identity)?.title)
			.filter(Boolean);
		return `${index + 1}. ${formatWalkTime(stop.at)} – ${getStopLabel(stop) || stop.address || 'unknown position'}${
			placeTitles.length ? `: ${placeTitles.join(', ')}` : ''
		}`;
	});
	const sections = [
		`# Walk overview

Started ${formatWalkTime(walk.startedAt)}, duration ${formatWalkDuration(stats.durationMs)}, ${stats.stops} stops, roughly ${formatWalkDistance(stats.distanceMeters)}${stats.areas.length ? ` in ${stats.areas.join(', ')}` : ''}.`,
		`# Stops in order

${stopLines.join('\n') || '- none recorded'}`,
		`# Visited places

${walk.visitedPlaces.map((place) => formatVisitedPlaceLine(place, walk)).join('\n') || '- none'}`
	];
	if (walk.stories.length > 0) {
		sections.push(
			`# Stories the user read during the walk

${walk.stories
	.map(
		(story) =>
			`## ${story.headline || 'Untitled'}${story.address ? ` (${story.address})` : ''}
${getStoryExcerpt(story.text, WALK_RECAP_STORY_EXCERPT_LENGTH)}`
	)
	.join('\n\n')}`
		);
	}
	return sections.join('\n\n');
}
