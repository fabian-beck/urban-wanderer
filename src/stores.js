import { writable, get } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { LABELS } from './constants.js';
import { labelPlaces } from "./util/ai.js";
import { loadPlaces, loadArticleTexts, loadExtracts } from "./util/geo.js";

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
                const labels = await labelPlaces(placesTmp);
                placesTmp = placesTmp.map((place, i) => ({ ...place, labels: labels[i] }));
                placesHere.set(placesTmp.filter(place => place.dist < 100 || get(coordinates).address.includes(place.title)));
                await loadArticleTexts(get(placesHere));
                placesNearby.set(placesTmp.filter(place => !get(placesHere).includes(place)));
                await loadExtracts(get(placesNearby));
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

// story
export const storyTexts = writable([]);

// error store
export const errorMessage = writable(null);