import OpenAI from "openai";
import { OPENAI_API_KEY } from "../.openai_api_key.js";
import { placesHere, placesNearby, coordinates, preferences, places, placesSurrounding, audioState } from "../stores.js";
import { get } from "svelte/store";
import { LABELS, CLASSES } from "../constants.js";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod"

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

let audio = null;


// ----------------------------------------------

async function translatePlaceName(place) {
    const instructions = `You are a chat assistant helping a user to translate place names to ${get(preferences).lang}.

You must skip places that are difficult to translate or are already in the targeted language (${get(preferences).lang}). Generally, skip place names in English.

For a place "A" output a JSON object like this:

{
    title: "A",
    translation: "TRANSLATION_A"
}

IMPORTANT: In case of doubt, skip the place. Fewer translations are better. Then, return the original name.

{
    title: "A",
    translation: "A"
}
`;
    const Translation = z.object({
        title: z.string(),
        translation: z.string()
    });
    const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4.1-mini",
        messages: [
            {
                role: "system", content: instructions,
            },
            {
                role: "user",
                content: place.title,
            },
        ],
        response_format: zodResponseFormat(Translation, 'translation')
    });
    const translation = completion.choices[0].message.parsed;
    return translation;
}

export async function groupDuplicatePlaces() {
    const $places = get(places);
    const translations = await Promise.all($places.map(place => translatePlaceName(place)));
    console.log('Translations:', translations);

    const placesNameIsSimilar = (name1, name2) => {
        name1 = name1.toLowerCase();
        name2 = name2.toLowerCase();
        // remove content in brackets
        name1 = name1.replace(/ *\([^)]*\) */g, "");
        name2 = name2.replace(/ *\([^)]*\) */g, "");
        // remove special characters
        name1 = name1.replace(/[^a-z0-9]/g, '');
        name2 = name2.replace(/[^a-z0-9]/g, '');
        return name1 === name2;
    }

    const newPlaces = [];
    for (const place of $places) {
        const translation = translations.find(translation => placesNameIsSimilar(place.title, translation.title));
        if (translation && translation.translation !== place.title) {
            place.title = `${translation.translation} (${place.title})`;
        }
        const previousPlace = newPlaces.find(p => placesNameIsSimilar(p.title, place.title));
        if (previousPlace) {
            if (previousPlace.lang === get(preferences).lang) {
                // replace previous place with the new one
                newPlaces[newPlaces.indexOf(previousPlace)] = place;
            }
            continue;
        }
        newPlaces.push(place);
    }
    console.log('Places after grouping:', newPlaces);
    places.set(newPlaces);
}

// ----------------------------------------------

const analysisCache = {};

async function analyzeSinglePlace(place) {
    const instructions = `You are a chat assistant helping a user analyze places:
(1) To classify them
(2) To assign labels to them
(3) To rate them based on their impact and importance to the user's environment

Available CLASSES are:
${Object.keys(CLASSES).map(classLabel => `- ${classLabel}: ${CLASSES[classLabel].description}`).join("\n")}
        
Available LABELS are:
${LABELS.map(label => `- ${label}`).join("\n")}

Available IMPORTANCE values are:
1: very low
2: low
3: medium
4: high
5: very high

Aspects that contribute to HIGER IMPORTANCE are:
* the place is a landmark or a famous building
* the place is unique in the area
* the place is of historical or cultural significance
* the place is related to a well - known person or event
* the place is characteristic for the area
* the place dominates the perceived environment (e.g., a skyscraper, a castle, a park)

Aspects that contribute to LOWER IMPORTANCE are:
* the place is a generic business or a shop
* the place is a detail of a larger place
* the place is a larger area (e.g., a city, a district, a region)
* the place is a larger geographic feature (e.g., a river, a lake, a mountain)
* the place is a generic entity (e.g., a concept, a non-physical object)
* the place is maybe just an office of a business or intitution
* the place has vanished or is not accessible anymore

To best best characterize the place answer with 
* exactly one class,
* up to three labels, and
* one importance value.

For a place "A" and its description output a JSON object like this:

{
    cls: "CLASS1",
        labels: ["LABEL1", "LABEL2"]
    importance: 5
}
    
FURTHER INSTRUCTIONS:
* Geographic places like rivers or lakes, that are not a specific location, should be labeled only as "GEOGRAPHY" and have a very low importance as they can be accessed from many locations.
`;
    const dataString = `* ${place.title}: ${place.snippet || place.description || place.type || ""} `;
    console.log('Single place analysis instructions and data:', [instructions, dataString]);
    const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "system", content: instructions,
            },
            {
                role: "user",
                content: dataString,
            },
        ],
        text: {
            format: {
                type: "json_object"
            }
        }
    });
    const json = JSON.parse(response.output_text);
    console.log('Single place analysis result:', json);
    // update cache
    analysisCache[place.title] = json;
}


// ToDo: Support cases where two places have the same title, e.g., http://localhost:5173/?lat=48.85882&lon=10.41824
export async function analyzePlaces() {
    const $places = get(places);
    console.log('Places before analysis:', $places);
    // get places with cached labels (labelsCache)
    const placesWithoutCachedAnalysis = $places.filter(place => !analysisCache[place.title]);
    if (placesWithoutCachedAnalysis.length > 0) {
        // analyze each place separately, but concurrently
        await Promise.all(placesWithoutCachedAnalysis.map(place => analyzeSinglePlace(place)));
    }
    const newPlaces = $places.map(place => ({
        ...place,
        labels: analysisCache[place.title]?.labels,
        cls: analysisCache[place.title]?.cls,
        importance: analysisCache[place.title]?.importance,
    }));
    // remove non-geographic classes
    const nonGeoClasses = Object.keys(CLASSES).filter(classLabel => CLASSES[classLabel]?.nonGeo);
    places.set(newPlaces.filter(place => !nonGeoClasses.includes(place.cls)));
}

// ----------------------------------------------

// summarize article
const summaryCache = {};
export async function summarizeArticle(article) {
    if (summaryCache[article]) {
        return summaryCache[article];
    }
    const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
            {
                role: "system", content: `You are a chat assistant providing a summary description for a place.
                
                Describe the following place in a short paragraph. Answer in language '${get(preferences).lang}'.

    ${article} `,
            },
        ]
    });
    const summary = completion.choices[0].message.content;
    summaryCache[article] = summary;
    return summary;
}

// web search for a place
export async function searchPlaceWeb(place) {
    const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        tools: [{ type: "web_search_preview" }],
        input: `You are a chat assistant helping a user to find more information and links about a place.

Search the web for detailed information, current events, opening hours, or other relevant links about the following place. Keep the search restricted to the specific place. Answer in language '${get(preferences).lang}'.

PLACE: ${place} located near ${get(coordinates).address}. The user is currently at the place.

Answer as a list links, consisting each of a short summary of the information ("text" without url), with additional properties for "url" and "source_domain". The links should include only information relevant for a current touristic visitor of the place. Avoid redundancies. Directions are not necessary as the user is at the place already. Avoid any general description of the place and do not provide general information about the city or region. Do not address the user directly or ask for feedback. Do not list businesses, restaurants, or similar places unless they are of historical or cultural significance. Do not list events or activities that are not directly related to the place. Do not list general travel information or general tourist information.`,
        text: {
            format: {
                type: "json_schema",
                name: "links",
                schema: {
                    type: "object",
                    properties: {
                        links: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    url: { type: "string" },
                                    text: { type: "string" },
                                    source_domain: { type: "string" },
                                },
                                required: ["url", "text", "source_domain"],
                                additionalProperties: false,
                            }
                        }
                    },
                    required: ["links"],
                    additionalProperties: false,
                }
            }
        }
    });
    console.log("Web search response:", response.output_text);
    return JSON.parse(response.output_text).links;
}

// ----------------------------------------------

// generate story about the user position
export async function generateStory(storyTexts) {
    if (!storyTexts) {
        storyTexts = [];
    }
    const initialMessage = {
        role: "system", content: `
You are a city guide: ${get(preferences).guideCharacter}, and always concise and factual.

Tell something interesting about the user's current position. Answer in language '${get(preferences).lang}'.

# The user's current position is:

${get(coordinates).address}

# The position is close to /in:

${get(placesHere).map(place =>
            `## ${place.title}: ${place.labels?.join(", ")}    	    
Rating: ${place.stars}

${place.facts || place.article || place.description || place.snippet || place.type || ""}
`).join("\n")
            }

# Nearby places are:

${get(placesNearby).map(place =>
                `
## ${place.title} (${place.dist}m): ${place.labels?.join(", ")}
Rating: ${place.stars}
    
${place.facts || place.article || place.description || place.snippet || place.type || ""}
`).join("\n")
            }

# The user is in:

${get(placesSurrounding).map(place => `## ${place.title}
    
${place.facts || place.article || place.description || place.snippet || place.type || ""}
    `).join("\n")
            }


----------------------------------------------

# IMPORTANT INSTUCTIONS:

User's preferences are the following topics:
${get(preferences).labels?.map(label => `- ${label}`).join("\n")}

The story should be up to ${Math.min(Math.round(0.5 + (get(placesHere).length + get(placesSurrounding).length) / 3), 4)} paragraphs long and focus on the position of the user and the most closest places.
Avoid giving directions or distances.

Keep the language as concise as possible and factual. 
You may use an informal tone, but use a moderate language.
Try to realisticially describe the relevance of places, but do not exaggerate; not all places are "famous" or "important".
Avoid generic claims like "this is a famous place" or "the place has a rich history".
Do not conclude paragraphs with a generic statements.

Just give summary of the most important information, but do not reply to the user's questions. 
Do not welcome the user or ask for feedback.
Do not mention the exact address and consider that GPS coordinates are not always exact.

Remember that you enact a ${get(preferences).guideCharacter} guide and take this role seriously towards exaggeration and over-enthusiasm.
Consider that the user is ${get(preferences).familiarity} with the area; select the facts and adapt the explanations accordingly.
`,
    };
    let messages = [initialMessage, ...storyTexts.map(text => ({ role: "assistant", content: text }))];
    if (storyTexts.length > 0) {
        messages.push({
            role: "system", content: `Tell the user more about something different. You may focus on something specific, but never repeat yourself.

Remember, the user is at this position:
${get(coordinates).address
                }

The position is close to /in:
${get(placesHere).map(place =>
                    `* ${place.title}: ${place.labels?.join(", ")}`
                ).join("\n")
                }

Strictly stick to the initially provided instructions and facts about the places.
Write one to three paragraphs of text. 
Give the text a headline marked in bold font.
` });
    }
    console.log("Story writing instructions", messages);
    const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: messages,
    });
    textToSpeech(completion.choices[0].message.content);
    return completion.choices[0].message.content;
}

// ----------------------------------------------

// extract and list historic events 
export async function extractHistoricEvents() {
    let relevantPlaces = get(placesHere).filter(place => place.stars > 2);
    if (relevantPlaces.length < 2) {
        relevantPlaces.push(...get(placesSurrounding));
    }
    const instructions = `You are a chat assistant helping a user to extract historic events for nearby places.

Extract and list historic events from the following text descring nearby places. 

Put more emphasis on higher rated places. Answer in language '${get(preferences).lang}'.

${relevantPlaces.map(place =>
        `# ${place.title}: ${place.labels?.join(", ")}
Rating: ${place.stars}` +
        `${place.article || place.description || place.snippet || place.type || ""}`
    ).join("\n\n")
        }

Only output a list of events in ascending temporal in JSON format.If events refer to a time range, translate the range to the start year of the range("year"), but give the range description in "date_string".Years BC should be negative.

Skip events if they are not immediately relevant for the specific, narrower place, especially early events from stone age, middle ages, or similar.Prefer truely local events of the very specific place, over those that affect the whole town or region.

        Remember, the user is at this position:
${get(coordinates).address
        }
                
If the list of places is empty or the text is too short, leave the list of events empty.
`;
    console.log("Historic events instructions", [instructions]);
    const response = await openai.responses.create({
        model: "gpt-4.1",
        input: [
            {
                role: "system", content: instructions,
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "event",
                schema: {
                    type: "object",
                    properties: {
                        events: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    year: { type: "number" },
                                    date_string: { type: "string" },
                                    text: { type: "string" }
                                },
                                required: ["year", "date_string", "text"],
                                additionalProperties: false,
                            }
                        }
                    },
                    required: ["events"],
                    additionalProperties: false,
                }
            }
        }
    });
    console.log("Historic events response:", response.output_text);
    return JSON.parse(response.output_text).events;
}

export async function extractFactsFromArticle(article) {
    const instructions = `You are a chat assistant helping a user to extract facts from an article, relevant when visiting the place.

Return a list of bullet points, focusing on the most important facts. 
Answer in language '${get(preferences).lang}'.    
`;
    console.log("Extract facts instructions", [instructions]);
    const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "system", content: instructions,
            },
            {
                role: "user", content: article,
            },
        ]
    });
    console.log("Extract facts response:", [response.output_text]);
    return response.output_text;
}

export async function textToSpeech(text) {
    if (!get(preferences).audio)
        return;
    if (get(audioState) === 'playing') {
        audioState.set('paused');
        if (audio) {
            audio.pause();
        }
    }
    audioState.set('loading');
    console.log('Text to speech:', text);
    const response = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        instructions: "You are friendly and motivated city guide and speak accordingly in a moderate and friendly tone. Pronounciation can be colloquial and deviate from the standard language to not sound too artificial. Make pauses between sentences and paragraphs, and use enganging intonation to make the speech more lively. Filler words like 'uhm' or 'well' are allowed to make the speech more natural.",
        speed: 1.5,
        input: text,
    });
    const blob = await response.blob();
    if (audio) {
        audio.pause();
    }
    audio = new Audio(URL.createObjectURL(blob));
    if (get(audioState) === 'paused') {
        return;
    }
    document.querySelectorAll('audio').forEach(audio => audio.pause());
    audioState.set('playing');
    audio.play();
    const unsubscribe = audioState.subscribe(state => {
        if (state === 'paused') {
            audio.pause();
            unsubscribe();
        }
    });
    audio.onended = () => {
        audioState.set('paused');
        audio = null;
    };
}