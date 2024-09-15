
import { coordinates, preferences } from "../stores.js";
import { nArticles, lang } from "../constants.js";
import { get } from "svelte/store";

export async function loadPlaces() {
    const $coordinates = get(coordinates);
    if (!$coordinates) {
        return;
    }
    const places = await geoSearchForPlaces($coordinates);
    if ($coordinates.village && !places.find(place => place.title === $coordinates.village)) {
        places.push(await nameSearchForPlace($coordinates.village));
    }
    if ($coordinates.town && !places.find(place => place.title === $coordinates.town)) {
        places.push(await nameSearchForPlace($coordinates.town));
    }
    await loadArticleTexts(places);
    return places;
}

async function geoSearchForPlaces(coordinates) {
    const response = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coordinates.latitude}|${coordinates.longitude}&gsradius=${get(preferences).radius}&gslimit=${nArticles}&format=json&origin=*`
    );
    const data = await response.json();
    return data.query.geosearch;
}

async function nameSearchForPlace(name) {
    console.log("searchPlace", name);
    const response2 = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${name}&srlimit=1&format=json&origin=*`
    );
    const data2 = await response2.json();
    return data2.query.search[0];
}

async function loadArticleTexts(places) {
    await Promise.all(
        places.map(async place => {
            const response = await fetch(
                `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=revisions&rvprop=content&rvslots=main`
            );
            const data = await response.json();
            place.article = data.query.pages[place.pageid].revisions[0].slots.main["*"];
        })
    );
}