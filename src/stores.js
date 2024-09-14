import { writable, get } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { LABELS } from './constants.js';
import { labelPlaces } from "./util/ai.js";
import { loadPlaces } from "./util/geo.js";

// Coordinates stores
function createCoordinates() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async () => {
            try {
                const coords = (await Geolocation.getCurrentPosition({ enableHighAccuracy: true })).coords;
                // translate coordinate into city district via Overpass API
                set({ latitude: coords.latitude, longitude: coords.longitude });
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${get(coordinates).latitude}&lon=${get(coordinates).longitude}&zoom=18&addressdetails=1`);
                const data = await response.json();
                set({ latitude: coords.latitude, longitude: coords.longitude, address: data.display_name });

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
    const { subscribe, set, update } = writable(null);
    return {
        subscribe,
        update: async () => {
            try {
                set(await loadPlaces());
                await labelPlaces();
            } catch (error) {
                console.error(error);
                errorMessage.set("Could not load places: " + error);
            }
        },
        setLabels: (labels) => {
            update(places => places.map((place, i) => ({ ...place, labels: labels[i] })));
        },
        reset: () => set(null)
    };
}
export const places = createPlaces();

// story
export const storyText = writable(null);

// error store
export const errorMessage = writable(null);