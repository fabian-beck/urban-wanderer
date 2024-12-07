import { writable, get, derived } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { CLASSES, LABELS } from "./constants.js";
import { analyzePlaces, groupDuplicatePlaces, textToSpeech } from "./util/ai.js";
import { loadWikipediaPlaces as loadWikipediaPlaces, loadArticleTexts, loadExtracts, loadOsmPlaces, loadAddressData, getRandomPlaceCoordinates, loadWikipediaImageUrls } from "./util/geo.js";

let prefsInitialized = false;

// Coordinates stores
function createCoordinates() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async (coords) => {
            try {
                if (coords === "random") {
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
    lang: 'de',
    sourceLanguages: ['de', 'en'],
    audio: true
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
                let [placesTmp, placesOsm] = await Promise.all([loadWikipediaPlaces(), loadOsmPlaces()]);
                set(mergePlaces(placesTmp, placesOsm));
                loadingMessage.set("Grouping places ...");
                await groupDuplicatePlaces();
                loadingMessage.set("Loading article extracts ...");
                await loadExtracts(get(places));
                loadingMessage.set("Analyzing places ...");
                await analyzePlaces();
                console.log('Places after analysis:', get(places));
                loadMetadataAndRate();
            } catch (error) {
                console.error(error);
                errorMessage.set("Could not load places: " + error);
            }
        },
        reset: () => set(null)
    };
}
export const places = createPlaces();


// surrounding places store (derived from places)
export const placesSurrounding = derived([coordinates, places], ([$coordinates, $places]) => {
    if (!$coordinates || !$places) return [];
    const addressRemainder = $coordinates.address.split(", ").slice(1).join(", ");
    return $places.filter(place => {
        if (addressRemainder.includes(place.title)) {
            place.type = "address";
            return true;
        }
        if (CLASSES[place.cls]?.isSurrounding) {
            return true;
        }
    });
});

// places (here) store (derived from places and surrounding places)
export const placesHere = derived([coordinates, places, placesSurrounding], ([$coordinates, $places, $placesSurrounding]) => {
    if (!$coordinates || !$places || !$placesSurrounding) return [];
    return $places.filter(place => {
        if ((!place.dist || place.dist < (CLASSES[place.cls]?.radius || 100)) && !$placesSurrounding.includes(place)) {
            return true;
        }
    });
});

// places (nearby) store (derived from places, surrounding places, and places here)
export const placesNearby = derived([coordinates, places, placesSurrounding, placesHere], ([$coordinates, $places, $placesSurrounding, $placesHere]) => {
    if (!$coordinates || !$places || !$placesSurrounding || !$placesHere) return [];
    return $places.filter(place => {
        if (!$placesSurrounding.includes(place) && !$placesHere.includes(place)) {
            return true;
        }
    });
});


// story
export const storyTexts = writable([]);

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

async function loadMetadataAndRate() {
    loadWikipediaImageUrls('imageThumb', 100);
    loadWikipediaImageUrls('image', 500);
    loadArticleTexts(get(placesHere));
    loadArticleTexts(get(placesSurrounding));
}

function mergePlaces(placesTmp, placesOsm) {
    placesTmp = placesTmp.map(place => {
        const osm = placesOsm.find(osm => osm.title === place.title);
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
    placesOsm.forEach(osm => {
        if (!placesTmp.find(place => place.title === osm.title)) {
            placesTmp.push(osm);
        }
    });
    return placesTmp;
}