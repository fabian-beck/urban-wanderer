import { writable, get } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { nArticles, lang } from './constants.js';

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

// Radius store
export const radius = writable(1000);

// Places store
function createPlaces() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async () => {
            try {
                const $coordinates = get(coordinates);
                if (!$coordinates) {
                    return;
                }
                const response = await fetch(
                    `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${$coordinates.latitude}|${$coordinates.longitude}&gsradius=${get(radius)}&gslimit=${nArticles}&format=json&origin=*`
                );
                const data = await response.json();
                set(data.query.geosearch);
            } catch (error) {
                console.error(error);
            }
        },
        reset: () => set(null)
    };
}
export const places = createPlaces();