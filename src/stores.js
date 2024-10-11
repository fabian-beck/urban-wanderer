import { writable, get } from "svelte/store";
import { Geolocation } from '@capacitor/geolocation';
import { LABELS } from "./constants.js";
import { labelPlaces, ratePlaces } from "./util/ai.js";
import { loadPlaces, loadArticleTexts, loadExtracts, loadOsmData, loadAddressData, getRandomPlaceCoordinates } from "./util/geo.js";

// Coordinates stores
function createCoordinates() {
    const { subscribe, set } = writable(null);
    return {
        subscribe,
        update: async (random = false) => {
            try {
                let coords;
                if (random) {
                    coords = await getRandomPlaceCoordinates();
                } else {
                    coords = (await Geolocation.getCurrentPosition({ enableHighAccuracy: true })).coords;
                }
                const addressData = await loadAddressData(coords);
                console.log(addressData);
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
        update: async () => {
            try {
                loadingMessage.set("Loading places from Wikipedia ...");
                let placesTmp = await loadPlaces();
                loadingMessage.set("Loading places from OpenStreetMap ...");
                const placcesOsm = await loadOsmData();
                placcesOsm.forEach(osm => {
                    const place = placesTmp.find(place => place.title === osm.title);
                    if (place) {
                        place.type = osm.type;
                        place.url = osm.url;
                        place.wikipedia = osm.wikipedia;
                    } else {
                        placesTmp.push(osm);
                    }
                });
                loadingMessage.set("Labeling places ...");
                const labels = await labelPlaces(placesTmp);
                placesTmp = placesTmp.map((place, i) => ({ ...place, labels: labels[i] }));
                // cut first part (unit comma) from address 
                const addressRemainder = get(coordinates).address.split(", ").slice(1).join(", ");
                const placesSurroundingTmp = placesTmp.filter(place => {
                    if (addressRemainder.includes(place.title)) {
                        place.type = "address";
                        return true;
                    }
                });
                const placesHereTmp = placesTmp.filter(place => place.dist < 100 && !placesSurroundingTmp.includes(place));
                placesHereTmp.forEach(place => place.dist = 0);
                loadingMessage.set("Loading article texts ...");
                await loadArticleTexts(placesHereTmp);
                const placesNearbyTmp = placesTmp.filter(place => !placesHereTmp.includes(place) && !placesSurroundingTmp.includes(place));
                loadingMessage.set("Loading extracts ...");
                await loadExtracts(placesNearbyTmp);
                loadingMessage.set("Rating places ...");
                await ratePlaces(placesTmp);
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

// loading message store
export const loadingMessage = writable(null);