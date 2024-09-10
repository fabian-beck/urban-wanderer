import { writable, get } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { nArticles, lang, LABELS } from './constants.js';
import { labelPlaces } from "./AI.js";

// Coordinates stores
function createCoordinates() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async () => {
            try {
                set((await Geolocation.getCurrentPosition({ enableHighAccuracy: true })).coords);
            } catch (error) {
                console.error(error);
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
                const $coordinates = get(coordinates);
                if (!$coordinates) {
                    return;
                }
                const response = await fetch(
                    `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${$coordinates.latitude}|${$coordinates.longitude}&gsradius=${get(preferences).radius}&gslimit=${nArticles}&format=json&origin=*`
                );
                const data = await response.json();
                set(data.query.geosearch);
                labelPlaces();
            } catch (error) {
                console.error(error);
            }
        },
        setLabels: async (labels) => {
            update(places => places.map((place, i) => ({ ...place, labels: labels[i] })));
        },
        reset: () => set(null)
    };
}
export const places = createPlaces();