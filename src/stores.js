import { writable, get, derived } from 'svelte/store';
import { Geolocation } from '@capacitor/geolocation';
import { CLASSES, LABELS } from './constants.js';
import { analyzePlaces, groupDuplicatePlaces, generateStory } from './util/ai.js';
import {
    loadWikipediaPlaces as loadWikipediaPlaces,
    loadArticleTexts,
    loadExtracts,
    loadOsmPlaces,
    loadAddressData,
    getRandomPlaceCoordinates,
    loadWikipediaImageUrls,
    loadWaterMap
} from './util/geo.js';

let prefsInitialized = false;

// Coordinates stores
function createCoordinates() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async (coords) => {
            try {
                if (coords === 'random') {
                    coords = await getRandomPlaceCoordinates();
                } else if (!coords) {
                    coords = (await Geolocation.getCurrentPosition({ enableHighAccuracy: true })).coords;
                    console.log('Received coordinates:', coords);
                }
                const addressData = await loadAddressData(coords);
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
    labels: LABELS,
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
            try {
                // init timer
                const startTime = Date.now();
                let previousTime = startTime;
                loadingMessage.set('Loading places ...');
                loadWaterMap();
                let [placesTmp, placesOsm] = await Promise.all([loadWikipediaPlaces(), loadOsmPlaces()]);
                set(mergePlaces(placesTmp, placesOsm));
                console.log('Time to load places (s):', ((Date.now() - startTime) / 1000).toFixed(2));
                previousTime = Date.now();
                loadingMessage.set('Grouping places ...');
                await groupDuplicatePlaces();
                console.log('Time to group places (s):', ((Date.now() - previousTime) / 1000).toFixed(2));
                previousTime = Date.now();
                loadingMessage.set('Loading article extracts ...');
                await loadExtracts(get(places));
                console.log('Time to load extracts (s):', ((Date.now() - previousTime) / 1000).toFixed(2));
                previousTime = Date.now();
                loadingMessage.set('Analyzing places ...');
                await analyzePlaces();
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
                    place.stars > 0 &&
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
                    place.stars > 0
                ) {
                    return true;
                }
            })
            .sort((a, b) => (a.dist || Infinity) - (b.dist || Infinity));
    }
);

// story
export const storyTexts = writable([]);
export const storyLoading = writable(false);

// events
export const events = writable([]);

// error store
export const errorMessage = writable(null);

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
    loadWikipediaImageUrls('imageThumb', 100);
    loadWikipediaImageUrls('image', 500);
    await loadArticleTexts(get(placesHere));
    await loadArticleTexts(get(placesSurrounding));
    await loadArticleTexts(get(placesNearby));
}

function mergePlaces(placesTmp, placesOsm) {
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
    // Load facts before story generation
    await loadMetadata();
    
    // Clear previous stories
    storyTexts.set([]);
    storyLoading.set(true);
    
    try {
        const firstStory = await generateStory([]);
        storyTexts.set([firstStory]);
        storyLoading.set(false);
    } catch (error) {
        console.error('Background story generation failed:', error);
        storyLoading.set(false);
    }
}

// heading
export const heading = writable(0);

// place details visible
export const placeDetailsVisible = writable('');

// water map
export const waterMap = writable([]);
