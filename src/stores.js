import { writable, get, derived } from 'svelte/store';
import { Geolocation } from '@capacitor/geolocation';
import { nArticles } from './constants/core.js';
import { CLASSES } from './constants/place-classes.js';
import { AI_MODELS, LABELS } from './constants/ui-config.js';
import { analyzePlaces, getLastAnalysisCacheStats } from './util/ai-analysis.js';
import { groupDuplicatePlaces } from './util/ai-translation.js';
import { generateStory } from './util/ai-story.js';
import { extractInsightsFromArticle } from './util/ai-facts.js';
import {
	loadWikipediaPlaces,
	loadWikipediaArticleTexts,
	loadWikipediaExtracts,
	getRandomWikipediaPlaceCoordinates,
	loadWikipediaImageUrls,
	searchWikipediaPlaceCoordinates
} from './util/wikipedia.js';
import { loadWikidataImages } from './util/wikidata.js';
import {
	loadOsmPlaces,
	loadOsmAddressData,
	loadOsmWaterMap,
	loadOsmGreenMap,
	loadOsmActivityMap
} from './util/osm.js';
import { setDebugConsoleEnabled } from './util/debug-console.js';
import {
	createPerformanceRun,
	formatDuration,
	getPerformanceNow,
	logPerformanceSummary,
	withPerformance
} from './util/performance.js';

let prefsInitialized = false;

const DEFAULT_PREFERENCES = {
	radius: 500,
	labels: LABELS.map((label) => label.value),
	guideCharacter: 'friendly and helpful',
	familiarity: 'unfamiliar',
	lang: 'de',
	sourceLanguages: ['de', 'en'],
	audio: true,
	debug: false,
	aiModelSimple: AI_MODELS.DEFAULT_SIMPLE,
	aiModelAdvanced: AI_MODELS.DEFAULT_ADVANCED
};

const LEGACY_AI_MODEL_MIGRATIONS = {
	simple: {
		'gpt-5-nano': 'gpt-5.4-nano',
		'gpt-5-mini': AI_MODELS.DEFAULT_SIMPLE,
		'gpt-5': 'gpt-5.4'
	},
	advanced: {
		'gpt-5-mini': 'gpt-5.4-mini',
		'gpt-5': AI_MODELS.DEFAULT_ADVANCED
	}
};

function getValidAiModel(type, value) {
	const options = type === 'advanced' ? AI_MODELS.ADVANCED : AI_MODELS.SIMPLE;
	const fallback = type === 'advanced' ? AI_MODELS.DEFAULT_ADVANCED : AI_MODELS.DEFAULT_SIMPLE;
	const legacyValue = LEGACY_AI_MODEL_MIGRATIONS[type]?.[value];

	if (legacyValue) {
		return legacyValue;
	}
	if (options.some((option) => option.value === value)) {
		return value;
	}
	return fallback;
}

function normalizePreferences(prefs) {
	const normalized = { ...DEFAULT_PREFERENCES, ...prefs };
	normalized.aiModelSimple = getValidAiModel('simple', normalized.aiModelSimple);
	normalized.aiModelAdvanced = getValidAiModel('advanced', normalized.aiModelAdvanced);
	return normalized;
}

async function measure(label, callback, details = {}) {
	const startedAt = getPerformanceNow();
	const result = await withPerformance(label, callback, details);
	return {
		result,
		durationMs: getPerformanceNow() - startedAt
	};
}

// Coordinates stores
function createCoordinates() {
	const { subscribe, set } = writable(null);
	return {
		subscribe,
		update: async (coords) => {
			const perf = createPerformanceRun('coordinates.update', {
				mode: coords === 'random' ? 'random' : coords ? 'provided' : 'gps'
			});
			try {
				if (coords === 'random') {
					coords = await withPerformance(
						'coordinates.randomWikipediaPlace',
						() => getRandomWikipediaPlaceCoordinates(get(preferences).lang),
						{ lang: get(preferences).lang }
					);
				} else if (!coords) {
					coords = (
						await withPerformance(
							'coordinates.geolocation',
							() => Geolocation.getCurrentPosition({ enableHighAccuracy: true }),
							{ enableHighAccuracy: true }
						)
					).coords;
					console.log('Received coordinates:', coords);
				}
				perf.checkpoint('coordinates acquired', {
					latitude: coords.latitude,
					longitude: coords.longitude
				});
				const addressData = await withPerformance(
					'coordinates.reverseGeocode',
					() => loadOsmAddressData(coords, get(preferences).lang),
					{ lang: get(preferences).lang }
				);
				set({
					latitude: coords.latitude,
					longitude: coords.longitude,
					address: addressData.display_name,
					town: addressData.address.town || addressData.address.city,
					village: addressData.address.village || addressData.address.city_district,
					suburb: addressData.address.suburb || addressData.address.city_district,
					road: addressData.address.road
				});
				perf.end({
					town: addressData.address.town || addressData.address.city,
					road: addressData.address.road
				});
			} catch (error) {
				perf.fail(error);
				console.error(error);
				errorMessage.set(error);
			}
		},
		reset: () => set(null)
	};
}
export const coordinates = createCoordinates();

// Uers preferences store
export const preferences = writable({ ...DEFAULT_PREFERENCES });

// Function to save preferences to local storage
const savePreferences = (prefs) => {
	if (typeof localStorage !== 'undefined') {
		console.log('Saving preferences:', prefs);
		localStorage.setItem('preferences', JSON.stringify(prefs));
	}
};

// Function to load preferences from local storage
const loadPreferences = () => {
	if (typeof localStorage !== 'undefined') {
		const storedPrefs = localStorage.getItem('preferences');
		if (storedPrefs) {
			const parsedPrefs = JSON.parse(storedPrefs);
			const normalizedPrefs = normalizePreferences(parsedPrefs);
			console.log('Loading preferences:', normalizedPrefs);
			preferences.set(normalizedPrefs);
		}
	}
};

// Subscribe to preferences store to save changes
preferences.subscribe((prefs) => {
	setDebugConsoleEnabled(prefs.debug);
	if (!prefsInitialized) {
		prefsInitialized = true;
		return;
	}
	savePreferences(prefs);
});

// Load preferences when the application starts
loadPreferences();

// Places store
function createPlaces() {
	const { subscribe, set } = writable(null);
	return {
		subscribe,
		set,
		update: async () => {
			const currentCoordinates = get(coordinates);
			if (!currentCoordinates) {
				return;
			}
			const currentPreferences = get(preferences);
			const perf = createPerformanceRun('places.update', {
				latitude: currentCoordinates.latitude,
				longitude: currentCoordinates.longitude,
				radius: currentPreferences.radius,
				sourceLanguages: currentPreferences.sourceLanguages
			});
			const placesUpdateStartedAt = getPerformanceNow();
			const stageDurations = {};
			const startMapLoad = (label, loader, store) => {
				const mapPerf = createPerformanceRun(label);
				loader(currentCoordinates)
					.then((mapData) => {
						store.set(mapData || []);
						mapPerf.end({
							rows: Array.isArray(mapData) ? mapData.length : 0
						});
					})
					.catch((error) => {
						mapPerf.fail(error);
						console.error(`Failed to load ${label}:`, error);
						store.set([]);
					});
			};
			try {
				loadingMessage.set('Loading places ...');
				let { result: sourcePlaces, durationMs: sourceFetchDurationMs } = await measure(
					'places.sourceFetch',
					() =>
						Promise.allSettled([
							loadWikipediaPlaces(currentCoordinates, currentPreferences, nArticles),
							loadOsmPlaces(currentCoordinates)
						]).then((results) => [
							results[0].status === 'fulfilled' ? results[0].value : [],
							results[1].status === 'fulfilled' ? results[1].value : []
						]),
					{ nArticles }
				);
				stageDurations.sourceFetchMs = sourceFetchDurationMs;
				let [placesTmp, placesOsm] = sourcePlaces;
				const mergedPlaces = mergePlaces(placesTmp, placesOsm);
				set(mergedPlaces);
				perf.checkpoint('source fetch and merge complete', {
					wikipediaPlaces: placesTmp.length,
					osmPlaces: placesOsm.length,
					mergedPlaces: mergedPlaces.length
				});
				loadingMessage.set('Grouping places ...');
				const { result: groupedPlaces, durationMs: groupingDurationMs } = await measure(
					'places.groupDuplicatePlaces',
					() => groupDuplicatePlaces(get(places), currentCoordinates, currentPreferences),
					{ places: get(places)?.length || 0 }
				);
				stageDurations.groupingMs = groupingDurationMs;
				set(groupedPlaces);
				perf.checkpoint('grouping complete', {
					groupedPlaces: groupedPlaces.length
				});
				loadingMessage.set('Loading article extracts ...');
				const { durationMs: extractsDurationMs } = await measure(
					'places.loadWikipediaExtracts',
					() => loadWikipediaExtracts(get(places), currentPreferences.lang),
					{ places: get(places)?.length || 0 }
				);
				stageDurations.extractsMs = extractsDurationMs;
				perf.checkpoint('extracts complete', {
					placesWithDescriptions: get(places).filter((place) => place.description).length
				});
				loadingMessage.set('Analyzing places ...');
				const placeCountBeforeAnalysis = get(places)?.length || 0;
				const { result: analyzedPlaces, durationMs: analysisDurationMs } = await measure(
					'places.analyzePlaces',
					() => analyzePlaces(get(places), currentPreferences),
					{ places: placeCountBeforeAnalysis }
				);
				stageDurations.analysisMs = analysisDurationMs;
				set(analyzedPlaces);
				console.log('Places after analysis:', get(places));
				perf.checkpoint('analysis complete', {
					analyzedPlaces: analyzedPlaces.length,
					filteredPlaces: placeCountBeforeAnalysis - analyzedPlaces.length
				});
				rate();
				perf.checkpoint('rating complete', {
					visibleCandidates: get(places).filter((place) => place.stars > 1).length
				});
				const totalMs = getPerformanceNow() - placesUpdateStartedAt;
				const analysisCacheStats = getLastAnalysisCacheStats();
				logPerformanceSummary('places.update.summary', {
					total: formatDuration(totalMs),
					sourceFetch: formatDuration(stageDurations.sourceFetchMs),
					grouping: formatDuration(stageDurations.groupingMs),
					extracts: formatDuration(stageDurations.extractsMs),
					analysis: formatDuration(stageDurations.analysisMs),
					wikipediaPlaces: placesTmp.length,
					osmPlaces: placesOsm.length,
					mergedPlaces: mergedPlaces.length,
					groupedPlaces: groupedPlaces.length,
					finalPlaces: get(places)?.length || 0,
					visibleCandidates: get(places).filter((place) => place.stars > 1).length,
					analysisCached: analysisCacheStats.cached,
					analysisUncached: analysisCacheStats.uncached
				});
				startMapLoad('OSM water map', loadOsmWaterMap, waterMap);
				startMapLoad('OSM green map', loadOsmGreenMap, greenMap);
				startMapLoad('OSM activity map', loadOsmActivityMap, activityMap);
				perf.checkpoint('background map loads started');
				// Pregenerate first story part in background
				pregenerateStoryInBackground();
				perf.end({
					places: get(places)?.length || 0
				});
			} catch (error) {
				perf.fail(error);
				console.error(error);
				errorMessage.set('Could not load places: ' + error);
			}
		},
		reset: () => set(null)
	};
}
export const places = createPlaces();

// surrounding places store (derived from places)
export const placesSurrounding = derived([coordinates, places], ([$coordinates, $places]) => {
	if (!$coordinates || !$places) return [];
	const addressRemainder = $coordinates.address.split(', ').slice(1).join(', ');
	return $places.filter((place) => {
		if (addressRemainder.includes(place.title)) {
			place.type = 'address';
			return true;
		}
		if (CLASSES[place.cls]?.isSurrounding) {
			return true;
		}
	});
});

// places (here) store (derived from places and surrounding places)
export const placesHere = derived(
	[coordinates, places, placesSurrounding],
	([$coordinates, $places, $placesSurrounding]) => {
		if (!$coordinates || !$places || !$placesSurrounding) return [];
		return $places
			.filter((place) => {
				if (
					(!place.dist || place.dist < (CLASSES[place.cls]?.radius || 100)) &&
					place.stars > 2 &&
					!$placesSurrounding.includes(place)
				) {
					return true;
				}
			})
			.sort((a, b) => {
				// Sort by stars descending, then by dist ascending
				const starDiff = (b.stars || 0) - (a.stars || 0);
				if (starDiff !== 0) return starDiff;
				return (a.dist || Infinity) - (b.dist || Infinity);
			});
	}
);

// places (nearby) store (derived from places, surrounding places, and places here)
export const placesNearby = derived(
	[coordinates, places, placesSurrounding, placesHere],
	([$coordinates, $places, $placesSurrounding, $placesHere]) => {
		if (!$coordinates || !$places || !$placesSurrounding || !$placesHere) return [];
		return $places
			.filter((place) => {
				if (
					!$placesSurrounding.includes(place) &&
					!$placesHere.includes(place) &&
					place.stars > 2
				) {
					return true;
				}
			})
			.sort((a, b) => (a.dist || Infinity) - (b.dist || Infinity));
	}
);

// story
export const storyTexts = writable([]);
export const storyResponseIds = writable([]);
export const storyLoading = writable(false);
export const preloadedStory = writable(null);
export const preloadingStory = writable(false);

// events
export const events = writable([]);

// error store
export const errorMessage = writable(null);

// loading state store
export const loading = writable(false);

// loading message store
function createLoadingMessage() {
	const { subscribe, set: originalSet } = writable(null);
	return {
		subscribe,
		set: (message) => {
			console.log(message);
			originalSet(message);
		},
		reset: () => originalSet(null)
	};
}
export const loadingMessage = createLoadingMessage();

// audio state (loading, playing or paused)
export const audioState = writable('paused');

function rate() {
	get(places).forEach((place) => {
		place.stars = 0;
		place.starDescriptions = [];
		// one star for wikipedia article
		if (place.wikipedia || place.pageid) {
			place.stars += 1;
			place.starDescriptions.push({ number: 1, text: 'has a Wikipedia article' });
		}
		// up to two stars for importance
		if (place.importance > 3) {
			place.stars += place.importance - 3;
			place.starDescriptions.push({
				number: place.importance - 3,
				text:
					place.importance > 4
						? 'is very important for the location'
						: 'is important for the location'
			});
		}
		// up to two stars for matching labels
		const matchingLabels =
			place.labels?.filter((label) => get(preferences).labels?.includes(label)) || [];
		place.stars += Math.min(matchingLabels.length, 2);
		if (matchingLabels.length > 0) {
			place.starDescriptions.push({
				number: Math.min(matchingLabels.length, 2),
				text:
					matchingLabels.length > 1
						? 'matches multiple of your interests'
						: 'matches one of your interests'
			});
		}
	});
}

async function loadMetadata() {
	const perf = createPerformanceRun('metadata.load', {
		here: get(placesHere).length,
		nearby: get(placesNearby).length,
		surrounding: get(placesSurrounding).length
	});
	// Load images asynchronously and trigger store updates when complete
	loadPlaceImages('imageThumb', 100);
	loadPlaceImages('image', 500);

	await withPerformance(
		'metadata.articleTexts',
		() =>
			Promise.all([
				loadWikipediaArticleTexts(get(placesHere), get(preferences).lang),
				loadWikipediaArticleTexts(get(placesSurrounding), get(preferences).lang),
				loadWikipediaArticleTexts(get(placesNearby), get(preferences).lang)
			]),
		{
			here: get(placesHere).length,
			nearby: get(placesNearby).length,
			surrounding: get(placesSurrounding).length
		}
	);
	perf.checkpoint('article texts loaded', {
		articles: [...get(placesHere), ...get(placesNearby), ...get(placesSurrounding)].filter(
			(place) => place.article
		).length
	});

	// Extract insights for places that have articles (only for here and surrounding places)
	const placesWithArticles = [...get(placesHere), ...get(placesSurrounding)].filter(
		(place) => place.article
	);
	await withPerformance(
		'metadata.insights',
		() =>
			Promise.all(
				placesWithArticles.map(async (place) => {
					place.insights = await extractInsightsFromArticle(place.article, get(preferences));
				})
			),
		{ placesWithArticles: placesWithArticles.length }
	);
	perf.end({
		insights: placesWithArticles.filter((place) => place.insights).length
	});
}

async function loadPlaceImages(attribute, size) {
	const perf = createPerformanceRun(`images.${attribute}`, {
		size,
		places: get(places)?.length || 0
	});
	try {
		// 1. Try Wikipedia images first
		await withPerformance(
			`images.${attribute}.wikipedia`,
			() => loadWikipediaImageUrls(get(places), attribute, size, get(preferences).lang),
			{ size, places: get(places)?.length || 0 }
		);
	} catch (error) {
		console.error(`Could not load Wikipedia ${attribute} data:`, error);
	} finally {
		places.set(get(places));
		perf.checkpoint('wikipedia images attempted', {
			loaded: get(places).filter((place) => place[attribute]).length
		});
	}

	try {
		// 2. Try Wikidata for places without images
		await withPerformance(
			`images.${attribute}.wikidata`,
			() => loadWikidataImages(get(places), attribute, size),
			{ size, missingImages: get(places).filter((place) => !place[attribute]).length }
		);
	} catch (error) {
		console.error(`Could not load Wikidata ${attribute} data:`, error);
	} finally {
		places.set(get(places));
		perf.end({
			loaded: get(places).filter((place) => place[attribute]).length
		});
	}
}

function mergePlaces(placesTmp, placesOsm) {
	// Handle cases where inputs might be null/undefined
	if (!placesTmp) placesTmp = [];
	if (!placesOsm) placesOsm = [];

	placesTmp = placesTmp.map((place) => {
		const osm = placesOsm.find((osm) => osm.title === place.title);
		if (osm) {
			place.type = osm.type;
			place.url = osm.url;
			place.wikipedia = osm.wikipedia;
		}
		if (place.dist < 100) {
			place.dist = 0;
		}
		return place;
	});
	// add OSM places that are not in Wikipedia
	placesOsm.forEach((osm) => {
		if (!placesTmp.find((place) => place.title === osm.title)) {
			placesTmp.push(osm);
		}
	});
	return placesTmp;
}

async function pregenerateStoryInBackground() {
	const currentCoordinates = get(coordinates);
	if (!currentCoordinates) {
		return;
	}
	const perf = createPerformanceRun('story.pregenerate');

	// Load facts before story generation
	await withPerformance('story.metadataPrerequisites', () => loadMetadata());
	perf.checkpoint('metadata loaded');

	// Clear previous stories and preloaded content
	storyTexts.set([]);
	storyResponseIds.set([]);
	preloadedStory.set(null);
	storyLoading.set(true);
	preloadingStory.set(false);

	try {
		const firstStoryResult = await withPerformance(
			'story.generateFirstPart',
			() =>
				generateStory(
					[],
					get(placesHere),
					get(placesNearby),
					get(placesSurrounding),
					currentCoordinates,
					get(preferences)
				),
			{
				here: get(placesHere).length,
				nearby: get(placesNearby).length,
				surrounding: get(placesSurrounding).length
			}
		);
		storyTexts.set([firstStoryResult.text]);
		storyResponseIds.set([firstStoryResult.responseId]);
		storyLoading.set(false);
		// Start preloading the next story part immediately
		preloadNextStoryPart([firstStoryResult.text]);
		perf.end({
			characters: firstStoryResult.text.length
		});
	} catch (error) {
		perf.fail(error);
		console.error('Background story generation failed:', error);
		storyLoading.set(false);
	}
}

export async function preloadNextStoryPart(currentStories) {
	if (get(preloadingStory)) return; // Already preloading

	preloadingStory.set(true);
	try {
		const currentResponseIds = get(storyResponseIds);
		const lastResponseId =
			currentResponseIds.length > 0 ? currentResponseIds[currentResponseIds.length - 1] : null;

		const nextStoryResult = await withPerformance(
			'story.preloadNextPart',
			() =>
				generateStory(
					currentStories,
					get(placesHere),
					get(placesNearby),
					get(placesSurrounding),
					get(coordinates),
					get(preferences),
					lastResponseId
				),
			{ previousResponseId: Boolean(lastResponseId), existingStories: currentStories.length }
		);
		preloadedStory.set(nextStoryResult);
	} catch (error) {
		console.error('Error preloading next story part:', error);
	} finally {
		preloadingStory.set(false);
	}
}

// heading
export const heading = writable(0);

// place details visible
export const placeDetailsVisible = writable('');

// water map
export const waterMap = writable([]);

// green map
export const greenMap = writable([]);

// activity map
export const activityMap = writable([]);

// Update location function - orchestrates all store updates
export async function updateLocation(coords) {
	const perf = createPerformanceRun('updateLocation', {
		mode: coords === 'random' ? 'random' : coords ? 'provided' : 'gps'
	});
	try {
		loading.set(true);
		errorMessage.set(null);
		places.reset();
		coordinates.reset();
		storyTexts.set([]);
		events.set([]);
		loadingMessage.set('Updating location ...');
		await withPerformance('updateLocation.coordinates', () => coordinates.update(coords));
		perf.checkpoint('coordinates updated');
		loadingMessage.set('Loading places ...');
		await withPerformance('updateLocation.places', () => places.update());
		perf.checkpoint('places updated', {
			places: get(places)?.length || 0
		});
		loadingMessage.reset();
		loading.set(false);
		perf.end({
			places: get(places)?.length || 0
		});
	} catch (error) {
		perf.fail(error);
		loadingMessage.reset();
		loading.set(false);
		errorMessage.set('Error updating location: ' + error);
		console.error('Error updating location', error);
	}
}

// Search for place by name and update location
export async function searchForPlace(placeName) {
	const perf = createPerformanceRun('searchForPlace', { placeName });
	try {
		loading.set(true);
		loadingMessage.set(`Searching for "${placeName}"...`);
		const placeData = await withPerformance(
			'searchForPlace.wikipediaCoordinates',
			() => searchWikipediaPlaceCoordinates(placeName, get(preferences).lang),
			{ lang: get(preferences).lang }
		);

		// Reset loading state and call updateLocation (which will handle its own loading state)
		loading.set(false);
		await withPerformance('searchForPlace.updateLocation', () =>
			updateLocation({
				latitude: placeData.latitude,
				longitude: placeData.longitude
			})
		);
		perf.end({
			title: placeData.title
		});
	} catch (error) {
		perf.fail(error);
		loadingMessage.reset();
		loading.set(false);
		errorMessage.set(`Error searching for place: ${error.message}`);
		console.error('Error searching for place:', error);
	}
}
