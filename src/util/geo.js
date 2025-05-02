import { coordinates, preferences, places } from "../stores.js";
import { nArticles } from "../constants.js";
import { get } from "svelte/store";
import { extractFactsFromArticle } from "./ai.js";

export async function loadWikipediaPlaces() {
    const $coordinates = get(coordinates);
    if (!$coordinates) {
        return;
    }
    const places = [];
    get(preferences).sourceLanguages?.forEach(async lang => {
        places.push(...await wikipediaGeoSearchForPlaces($coordinates, lang));
    });
    const searchAndAddPlace = async (title) => {
        if (title && !places.find(place => place?.title === title)) {
            let place = await wikipediaNameSearchForPlace(title);
            if (!place) {
                return;
            }
            places.push(place);
        }
    }
    if ($coordinates.town) {
        searchAndAddPlace($coordinates.town);
        if ($coordinates.village) {
            searchAndAddPlace(`${$coordinates.village} (${$coordinates.town})`);
        }
        if ($coordinates.suburb) {
            searchAndAddPlace(`${$coordinates.suburb} (${$coordinates.town})`);
        }
        if ($coordinates.road) {
            searchAndAddPlace(`${$coordinates.road} (${$coordinates.town})`);
        }
    } else {
        searchAndAddPlace($coordinates.village);
    }
    console.log('Wikipedia places:', places);
    return places;
}

export async function loadArticleTexts(places) {
    const lang = get(preferences).lang;
    await Promise.all(
        places.map(async place => {
            if (!place.pageid) {
                return;
            }
            const response = await fetch(
                `https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=revisions&rvprop=content&rvslots=main`
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
            // extracts facts
            place.facts = await extractFactsFromArticle(place.article)
        })
    );
}

export async function loadExtracts(places) {
    await Promise.all(
        places.map(async place => {
            if (!place.pageid && !place.wikipedia) {
                return;
            }
            let response;
            try {
                if (place.pageid) {
                    response = await fetch(
                        `https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=extracts&exintro=1&explaintext=1`
                    );
                } else if (place.wikipedia) {
                    const placeLang = place.wikipedia.split(":")[0];
                    const placeTitle = place.wikipedia.split(":")[1];
                    response = await fetch(
                        `https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=${placeTitle}`
                    );
                }
                if (!response.ok) {
                    console.error(`Failed to fetch extract for place: ${place.title}. HTTP status: ${response.status}`);
                    return;
                }
                const data = await response.json();
                const pageid = Object.keys(data.query.pages)[0];
                if (data.query.pages[pageid].missing) {
                    console.warn(`Extract not found for place: ${place.title}`);
                    return;
                }
                place.description = data.query.pages[pageid].extract;
            } catch (error) {
                console.error(`Error fetching extract for place: ${place.title}`, error);
            }
        })
    );
}

export async function loadWikipediaImageUrls(attribute, size) {
    await Promise.all(
        get(places).map(async place => {
            let response;
            if (place.wikipedia) {
                const placeLang = place.wikipedia.split(":")[0];
                const placeTitle = place.wikipedia.split(":")[1];
                response = await fetch(
                    `https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${placeTitle}&origin=*&pithumbsize=${size}`
                );
            } else if (place.pageid) {
                response = await fetch(
                    `https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=pageimages&pithumbsize=${size}`
                );
            }
            if (!response) {
                return;
            }
            const data = await response.json();
            const pageid = Object.keys(data.query.pages)[0];
            if (data.query.pages[pageid].thumbnail) {
                place[attribute] = data.query.pages[pageid].thumbnail?.source;
            } else {
                // load first image from wiki page
                const response2 = await fetch(
                    `https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&prop=images&pageids=${place.pageid}&origin=*`
                );
                const data2 = await response2.json();
                const images = data2.query.pages[place.pageid].images;
                if (images) {
                    const firstImage = images[0].title;
                    const response3 = await fetch(
                        `https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&titles=${firstImage}&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=${size}`
                    );
                    const data3 = await response3.json();
                    const imageinfo = Object.values(data3.query.pages)[0].imageinfo;
                    if (imageinfo) {
                        place[attribute] = imageinfo[0].url;
                    }
                }
            }
            places.set(get(places));
        })
    );
}

export async function loadOsmPlaces() {
    try {
        const $coordinates = get(coordinates);
        const radius = 150;
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
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `data=${encodeURIComponent(overpassQuery)}`
        });
        const data = await response.json();
        console.log('OSM response:', data);
        const places = data.elements.filter(element => element.tags?.name).map(
            element => {
                const tags = element.tags;
                let title = tags.name.replace(/\s*\(.*?\)\s*/g, "");
                title = title.split(",")[0];
                return {
                    title: title,
                    description: tags.description,
                    type: tags.waterway || tags.amenity || tags.tourism ||
                        tags.historic || tags.man_made || tags.leisure,
                    url: tags["contact:website"] || tags.website,
                    wikipedia: tags.wikipedia,
                    lat: element.lat,
                    lon: element.lon,
                    dist: Math.sqrt(
                        Math.pow(element.lat - $coordinates.latitude, 2) +
                        Math.pow(element.lon - $coordinates.longitude, 2)
                    ) * 111139, // convert degrees to meters
                };
            }
        );
        console.log('OSM places:', places);
        return places;
    } catch (error) {
        console.error("Could not load OSM places:", error);
    }
}

export async function loadAddressData(coords) {
    const lang = get(preferences).lang;
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1&accept-language=${lang}`);
    const data = await response.json();
    return data;
}

export async function getRandomPlaceCoordinates() {
    const lang = get(preferences).lang;
    while (true) {
        const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`);
        const data = await response.json();
        if (data.coordinates) {
            return { latitude: data.coordinates.lat, longitude: data.coordinates.lon };
        }
    }
}

async function wikipediaGeoSearchForPlaces(coordinates, lang) {
    const response = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coordinates.latitude}|${coordinates.longitude}&gsradius=${get(preferences).radius}&gslimit=${nArticles}&format=json&origin=*`
    );
    const data = await response.json();
    data.query.geosearch.forEach(place => {
        // remove brackets from titles
        place.title = place.title.replace(/\s*\(.*?\)\s*/g, "");
        // remove text after comma
        place.title = place.title.split(",")[0];
        place.lang = lang;
    });
    console.log('Wikipedia geosearch response:', data);
    return data.query.geosearch;
}

async function wikipediaNameSearchForPlace(name) {
    const lang = get(preferences).lang;
    const response2 = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${name}&srlimit=1&format=json&origin=*`
    );
    const data2 = await response2.json();
    // for each search result, check if it has geocoordinates and is close to $coordinates
    for (const searchResult of data2.query.search) {
        // get geocoordinates through pageid
        const response3 = await fetch(
            `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&pageids=${searchResult.pageid}&origin=*`
        );
        const data3 = await response3.json();
        const pageid = Object.keys(data3.query.pages)[0];
        const coords = data3.query.pages[pageid].coordinates[0];
        // calculate distance
        const distance = Math.sqrt(
            Math.pow(coords.lat - get(coordinates).latitude, 2) +
            Math.pow(coords.lon - get(coordinates).longitude, 2)
        ) * 111139; // convert degrees to meters
        // if close enough, return place
        if (distance < 10000) {
            searchResult.title = searchResult.title.replace(/\s*\(.*?\)\s*/g, "");
            searchResult.title = searchResult.title.split(",")[0];
            if (name.toLowerCase().includes(searchResult.title.toLowerCase()) || searchResult.title.toLowerCase().includes(name.toLowerCase())) {
                console.log('Wikipedia name search response:', [name, searchResult]);
                return searchResult;
            }
        }
    }
    console.warn(`Could not find Wikipedia article for ${name}.`);
    return;
}

