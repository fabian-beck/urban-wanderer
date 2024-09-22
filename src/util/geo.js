import { coordinates, preferences } from "../stores.js";
import { nArticles, lang } from "../constants.js";
import { get } from "svelte/store";

export async function loadPlaces() {
    const $coordinates = get(coordinates);
    if (!$coordinates) {
        return;
    }
    const places = await wikipediaGeoSearchForPlaces($coordinates);
    if ($coordinates.village && !places.find(place => place.title === $coordinates.village)) {
        places.push(await wikipediaNameSearchForPlace($coordinates.village));
    }
    if ($coordinates.town && !places.find(place => place.title === $coordinates.town)) {
        places.push(await wikipediaNameSearchForPlace($coordinates.town));
    }
    return places;
}

export async function loadArticleTexts(places) {
    await Promise.all(
        places.map(async place => {
            if (!place.pageid) {
                return;
            }
            const response = await fetch(
                `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=revisions&rvprop=content&rvslots=main`
            );
            const data = await response.json();
            place.article = data.query.pages[place.pageid].revisions[0].slots.main["*"];
            // delete all wiki tables
            place.article = place.article.replace(/\{\|[\s\S]*?\|\}/g, "");
            place.article = place.article.replace(/\{\{[\s\S]*?\}\}/g, "");
            // delete all URLs
            place.article = place.article.replace(/\[http[^\]]*\]/g, "");
            // article still too long?
            if (place.article.length > 20000) {
                place.article = place.article.substring(0, 20000) + "...";
            }
        })
    );
}

export async function loadExtracts(places) {
    await Promise.all(
        places.map(async place => {
            const response = await fetch(
                `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=extracts&exintro=1&explaintext=1`
            );
            const data = await response.json();
            place.article = data.query.pages[place.pageid].extract;
        })
    );
}

export async function loadOSMData() {
    const $coordinates = get(coordinates);
    const radius = 100;
    const waterway = "river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point";
    const amenities = "museum|school|college|university|library|place_of_worship";
    const tourism = "viewpoint|attraction|mall|zoo|theme_park|aquarium|gallery|artwork|memorial|museum|theatre|cinema";
    const historic = "monument|memorial|monument|memorial|ruins|castle|church|tomb|battlefield|fort|city_gate|citywalls|gate|archaeological_site";
    const man_made = "statue|sculpture|obelisk|stone|cross|wayside_cross|wayside_shrine|shelter|tower|water_tower|chimney|bridge|tunnel|mine|adit|bunker|silo|tank|reservoir|water_tank|water_reservoir|storage_tank|storage_reservoir|water_storage_tank|water_storage_reservoir|storage|container";
    const leisure = "park|nature_reserve|sports_centre|stadium";

    const overpassQuery = `
[out:json];
(
    // Search for waterways
    relation[waterway~"${waterway}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for amenities
    node[amenity~"${amenities}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[amenity~"${amenities}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[amenity~"${amenities}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for tourism-related points of interest
    node[tourism~"${tourism}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[tourism~"${tourism}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[tourism~"${tourism}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for historic landmarks such as monuments and memorials
    node[historic~"${historic}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[historic~"${historic}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[historic~"${historic}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for man-made structures such as statues
    node[man_made~"${man_made}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[man_made~"${man_made}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[man_made~"${man_made}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for leisure facilities such as parks and gardens
    node[leisure~"${leisure}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[leisure~"${leisure}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[leisure~"${leisure}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
);
out body;
>;
out skel qt;
`;
    console.log(overpassQuery);
    const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
    });
    const data = await response.json();
    const places = data.elements.filter(element => element.tags?.name).map(
        element => {
            const tags = element.tags;
            return {
                title: tags.name,
                description: tags.description,
                type: tags.waterway || tags.amenity || tags.tourism ||
                    tags.historic || tags.man_made || tags.leisure,
                url: tags["contact:website"] || tags.website,
                wikipedia: tags.wikipedia,
                lat: element.lat,
                lon: element.lon,
                dist: 0
            };
        }
    );
    console.log(places);
    return places;
}

async function wikipediaGeoSearchForPlaces(coordinates) {
    const response = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coordinates.latitude}|${coordinates.longitude}&gsradius=${get(preferences).radius}&gslimit=${nArticles}&format=json&origin=*`
    );
    const data = await response.json();
    return data.query.geosearch;
}

async function wikipediaNameSearchForPlace(name) {
    const response2 = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${name}&srlimit=1&format=json&origin=*`
    );
    const data2 = await response2.json();
    return data2.query.search[0];
}