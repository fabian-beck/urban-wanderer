import { writable, get, derived } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { LABELS } from "./constants.js";
import { labelPlaces, ratePlaces } from "./util/ai.js";
import { loadWikipediaPlaces as loadWikipediaPlaces, loadArticleTexts, loadExtracts, loadOsmData as loadOsmPlaces, loadAddressData, getRandomPlaceCoordinates, loadWikipediaImageUrls } from "./util/geo.js";

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
                }
                const addressData = await loadAddressData(coords);
                set({ latitude: coords.latitude, longitude: coords.longitude, address: addressData.display_name, town: addressData.address.town || addressData.address.city, village: addressData.address.village || addressData.address.city_district });
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
    labels: LABELS
});

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
                loadingMessage.set("Labeling places...");
                await labelPlaces();
                console.log('Places after labeling:', get(places));
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
    });
});

// places (here) store (derived from places and surrounding places)
export const placesHere = derived([coordinates, places, placesSurrounding], ([$coordinates, $places, $placesSurrounding]) => {
    if (!$coordinates || !$places || !$placesSurrounding) return [];
    return $places.filter(place => {
        if (place.dist === 0 && !$placesSurrounding.includes(place)) {
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

async function loadMetadataAndRate() {
    await loadArticleTexts(get(placesHere));
    await loadExtracts(get(placesNearby));
    await loadWikipediaImageUrls(get(places));
    await ratePlaces();
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