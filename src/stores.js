import { writable } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';

export const coordinates = writable(0);

export async function updateCoordinates() {
    coordinates.set((await Geolocation.getCurrentPosition({ enableHighAccuracy: true })).coords);
}
