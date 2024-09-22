import { writable, get } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { LABELS } from './constants.js';
import { labelPlaces } from "./util/ai.js";
import { loadPlaces, loadArticleTexts, loadExtracts, loadOSMData as loadOsmData } from "./util/geo.js";

// Coordinates stores
function createCoordinates() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async () => {
            try {
                const coords = (await Geolocation.getCurrentPosition({ enableHighAccuracy: true })).coords;
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`);
                const data = await response.json();
                set({ latitude: coords.latitude, longitude: coords.longitude, address: data.display_name, town: data.address.town, village: data.address.village });
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
    radius: 1000,
    labels: LABELS
});

// Places store
function createPlaces() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async () => {
            try {
                let placesTmp = await loadPlaces();
                const placcesOsm = await loadOsmData();
                placesTmp = placesTmp.concat(placcesOsm.filter(osm => !placesTmp.find(place => place.title === osm.title)));
                const labels = await labelPlaces(placesTmp);
                placesTmp = placesTmp.map((place, i) => ({ ...place, labels: labels[i] }));
                const placesSurroundingTmp = placesTmp.filter(place => get(coordinates).address.includes(place.title));
                const placesHereTmp = placesTmp.filter(place => place.dist < 100 && !placesSurroundingTmp.includes(place));
                placesHereTmp.forEach(place => place.dist = 0);
                await loadArticleTexts(placesHereTmp);
                const placesNearbyTmp = placesTmp.filter(place => !placesHereTmp.includes(place) && !placesSurroundingTmp.includes(place));
                await loadExtracts(placesNearbyTmp);
                // set stores
                placesSurrounding.set(placesSurroundingTmp);
                placesHere.set(placesHereTmp);
                placesNearby.set(placesNearbyTmp);
                set(placesTmp);
            } catch (error) {
                console.error(error);
                errorMessage.set("Could not load places: " + error);
            }
        },
        reset: () => set(null)
    };
}
export const places = createPlaces();

// places (here) store
export const placesHere = writable([]);

// places (nearby) store
export const placesNearby = writable([]);

// surrounding places store
export const placesSurrounding = writable([]);

// story
export const storyTexts = writable([]);

// error store
export const errorMessage = writable(null);