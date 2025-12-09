import { writable, get, derived } from 'svelte/store';
import { Geolocation } from '@capacitor/geolocation';
import { nArticles } from './constants/core.js';
import { CLASSES } from './constants/place-classes.js';
import { LABELS } from './constants/ui-config.js';
import { analyzePlaces } from './util/ai-analysis.js';
import { groupDuplicatePlaces } from './util/ai-translation.js';
import { generateStory } from './util/ai-story.js';
import { extractInsightsFromArticle } from './util/ai-facts.js';
import {
	loadWikipediaPlaces,
	loadWikipediaArticleTexts,
	loadWikipediaExtracts,
	getRandomWikipediaPlaceCoordinates,
	loadWikipediaImageUrls
} from './util/wikipedia.js';
import { loadWikidataImages } from './util/wikidata.js';
import {
	loadOsmPlaces,
	loadOsmAddressData,
	loadOsmWaterMap,
	loadOsmGreenMap,
	loadOsmActivityMap
} from './util/osm.js';

let prefsInitialized = false;

// Coordinates stores
function createCoordinates() {
	const { subscribe, set } = writable(null);
	return {
		subscribe,
		update: async (coords) => {
			try {
				if (coords === 'random') {
					coords = await getRandomWikipediaPlaceCoordinates(get(preferences).lang);
				} else if (!coords) {
					coords = (await Geolocation.getCurrentPosition({ enableHighAccuracy: true })).coords;
					console.log('Received coordinates:', coords);
				}
				const addressData = await loadOsmAddressData(coords, get(preferences).lang);
				set({
					latitude: coords.latitude,
					longitude: coords.longitude,
					address: addressData.display_name,
					town: addressData.address.town || addressData.address.city,
					village: addressData.address.village || addressData.address.city_district,
					suburb: addressData.address.suburb || addressData.address.city_district,
					road: addressData.address.road
				});
			} catch (error) {
				console.error(error);
				errorMessage.set(error);
			}
		},
		reset: () => set(null)
	};
}
export const coordinates = createCoordinates();

// Uers preferences store
export const preferences = writable({
	radius: 500,
	labels: LABELS.map((label) => label.value),
	guideCharacter: 'friendly and helpful',
	familiarity: 'unfamiliar',
	lang: 'de',
	sourceLanguages: ['de', 'en'],
	audio: true,
	aiModelSimple: 'gpt-5-mini',
	aiModelAdvanced: 'gpt-5'
});

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
			console.log('Loading preferences:', JSON.parse(storedPrefs));
			preferences.set(JSON.parse(storedPrefs));
		}
	}
};

// Subscribe to preferences store to save changes
preferences.subscribe((prefs) => {
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
			try {
				// init timer
				const startTime = Date.now();
				let previousTime = startTime;
				loadingMessage.set('Loading places ...');
				// Load maps and update stores with error handling
				loadOsmWaterMap(currentCoordinates)
					.then((mapData) => waterMap.set(mapData || []))
					.catch((error) => {
						console.error('Failed to load water map:', error);
						waterMap.set([]);
					});
				loadOsmGreenMap(currentCoordinates)
					.then((mapData) => greenMap.set(mapData || []))
					.catch((error) => {
						console.error('Failed to load green map:', error);
						greenMap.set([]);
					});
				loadOsmActivityMap(currentCoordinates)
					.then((mapData) => activityMap.set(mapData || []))
					.catch((error) => {
						console.error('Failed to load activity map:', error);
						activityMap.set([]);
					});
				let [placesTmp, placesOsm] = await Promise.allSettled([
					loadWikipediaPlaces(currentCoordinates, get(preferences), nArticles),
					loadOsmPlaces(currentCoordinates)
				]).then((results) => [
					results[0].status === 'fulfilled' ? results[0].value : [],
					results[1].status === 'fulfilled' ? results[1].value : []
				]);
				set(mergePlaces(placesTmp, placesOsm));
				console.log('Time to load places (s):', ((Date.now() - startTime) / 1000).toFixed(2));
				previousTime = Date.now();
				loadingMessage.set('Grouping places ...');
				const groupedPlaces = await groupDuplicatePlaces(
					get(places),
					currentCoordinates,
					get(preferences)
				);
				set(groupedPlaces);
				console.log('Time to group places (s):', ((Date.now() - previousTime) / 1000).toFixed(2));
				previousTime = Date.now();
				loadingMessage.set('Loading article extracts ...');
				await loadWikipediaExtracts(get(places), get(preferences).lang);
				console.log('Time to load extracts (s):', ((Date.now() - previousTime) / 1000).toFixed(2));
				previousTime = Date.now();
				loadingMessage.set('Analyzing places ...');
				const analyzedPlaces = await analyzePlaces(get(places), get(preferences));
				set(analyzedPlaces);
				console.log('Places after analysis:', get(places));
				console.log('Time to analyze places (s):', ((Date.now() - previousTime) / 1000).toFixed(2));
				console.log(
					'Total time to preprocess places (s):',
					((Date.now() - startTime) / 1000).toFixed(2)
				);
				rate();
				// Pregenerate first story part in background
				pregenerateStoryInBackground();
			} catch (error) {
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
	// Load images asynchronously and trigger store updates when complete
	// 1. Try Wikipedia images first
	loadWikipediaImageUrls(get(places), 'imageThumb', 100, get(preferences).lang).then(() => {
		// 2. Try Wikidata for places without images
		loadWikidataImages(get(places), 'imageThumb', 100).then(() => places.set(get(places)));
	});
	loadWikipediaImageUrls(get(places), 'image', 500, get(preferences).lang).then(() => {
		// 2. Try Wikidata for places without images
		loadWikidataImages(get(places), 'image', 500).then(() => places.set(get(places)));
	});

	await Promise.all([
		loadWikipediaArticleTexts(get(placesHere), get(preferences).lang),
		loadWikipediaArticleTexts(get(placesSurrounding), get(preferences).lang),
		loadWikipediaArticleTexts(get(placesNearby), get(preferences).lang)
	]);

	// Extract insights for places that have articles (only for here and surrounding places)
	const placesWithArticles = [...get(placesHere), ...get(placesSurrounding)].filter(
		(place) => place.article
	);
	await Promise.all(
		placesWithArticles.map(async (place) => {
			place.insights = await extractInsightsFromArticle(place.article, get(preferences));
		})
	);
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

	// Load facts before story generation
	await loadMetadata();

	// Clear previous stories and preloaded content
	storyTexts.set([]);
	storyResponseIds.set([]);
	preloadedStory.set(null);
	storyLoading.set(true);
	preloadingStory.set(false);

	try {
		const firstStoryResult = await generateStory(
			[],
			get(placesHere),
			get(placesNearby),
			get(placesSurrounding),
			currentCoordinates,
			get(preferences)
		);
		storyTexts.set([firstStoryResult.text]);
		storyResponseIds.set([firstStoryResult.responseId]);
		storyLoading.set(false);
		// Start preloading the next story part immediately
		preloadNextStoryPart([firstStoryResult.text]);
	} catch (error) {
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

		const nextStoryResult = await generateStory(
			currentStories,
			get(placesHere),
			get(placesNearby),
			get(placesSurrounding),
			get(coordinates),
			get(preferences),
			lastResponseId
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
	try {
		loading.set(true);
		errorMessage.set(null);
		places.reset();
		coordinates.reset();
		storyTexts.set([]);
		events.set([]);
		loadingMessage.set('Updating location ...');
		await coordinates.update(coords);
		loadingMessage.set('Loading places ...');
		await places.update();
		loadingMessage.reset();
		loading.set(false);
	} catch (error) {
		loadingMessage.reset();
		loading.set(false);
		errorMessage.set('Error updating location: ' + error);
		console.error('Error updating location', error);
	}
}

// Search for place by name and update location
export async function searchForPlace(placeName) {
	try {
		loading.set(true);
		const { searchWikipediaPlaceCoordinates } = await import('./util/wikipedia.js');
		loadingMessage.set(`Searching for "${placeName}"...`);
		const placeData = await searchWikipediaPlaceCoordinates(placeName, get(preferences).lang);

		// Reset loading state and call updateLocation (which will handle its own loading state)
		loading.set(false);
		await updateLocation({
			latitude: placeData.latitude,
			longitude: placeData.longitude
		});
	} catch (error) {
		loadingMessage.reset();
		loading.set(false);
		errorMessage.set(`Error searching for place: ${error.message}`);
		console.error('Error searching for place:', error);
	}
}
