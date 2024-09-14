
import { coordinates, preferences } from "../stores.js";
import { nArticles, lang } from "../constants.js";
import { get } from "svelte/store";

export async function loadPlaces() {
    const $coordinates = get(coordinates);
    if (!$coordinates) {
        return;
    }
    const response = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${$coordinates.latitude}|${$coordinates.longitude}&gsradius=${get(preferences).radius}&gslimit=${nArticles}&format=json&origin=*`
    );
    const data = await response.json();
    const places = data.query.geosearch;
    // get page extracts
    await Promise.all(
        places.map(async place => {
            // const response = await fetch(
            //     `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&pageids=${place.pageid}&origin=*`
            // );
            // const data2 = await response.json();
            // place.extract = data2.query.pages[place.pageid].extract;

            // use full article: https://de.wikipedia.org/w/api.php?action=query&format=json&pageids=6318942&origin=*&prop=revisions&rvprop=content&rvslots=main
            const response = await fetch(
                `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=revisions&rvprop=content&rvslots=main`
            );
            const data2 = await response.json();
            console.log(data2.query.pages[place.pageid].revisions[0].slots.main["*"]);
            place.article = data2.query.pages[place.pageid].revisions[0].slots.main["*"];
        })
    );
    return places;
}