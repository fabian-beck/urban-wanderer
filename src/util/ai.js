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

export async function groupDuplicatePlaces() {
    const $places = get(places);
    const instructions = `You are an assistant helping translating place names to ${get(preferences).lang}. 
    
You must skip places that are difficult to translate or are already in the targeted language (${get(preferences).lang}). Generally, skip place names in English. 

For a list of places [A , B , C] output a JSON object like this:

    translations: [
        { "title": "A", "translation": "TRANSLATION_A" },
        // B skipped because there is no good translation
        { "title": "C", "translation": "TRANSLATION_C" }    
    ]
        
IMPORTANT: In case of doubt, skip the place. Fewer translations are better.
`;
    const dataString = `[${$places.map(place => place.title).join(", ")}]`;
    console.log(instructions);
    console.log(dataString);
    const Translation = z.object({
        title: z.string(),
        translation: z.string()
    });
    const Translations = z.object({
        translations: z.array(Translation)
    });
    const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system", content: instructions,
            },
            {
                role: "user",
                content: dataString,
            },
        ],
        response_format: zodResponseFormat(Translations, 'translations')
    });
    const translations = completion.choices[0].message.parsed.translations;
    console.log('Tranlations result:', translations);

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

// ToDo: Support cases where two places have the same title, e.g., http://localhost:5173/?lat=48.85882&lon=10.41824
export async function analyzePlaces() {
    const $places = get(places);
    console.log('Places before analysis:', $places);
    // get places with cached labels (labelsCache)
    const placesWithoutCachedAnalysis = $places.filter(place => !analysisCache[place.title]);

    if (placesWithoutCachedAnalysis.length > 0) {
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

To best best characterize the place answer with 
* exactly one class,
* up to three labels, and
* one importance value.

For a list of places [A, B, C] and their descriptions output a JSON object like this:

{
    "A": {
        cls: "CLASS1",
        labels: ["LABEL1", "LABEL2"]
        importance: 5
    },
    "B": {
        cls: "CLASS2",
        labels: ["LABEL3"]
        importance: 3
    },
    "C": {
        cls: "CLASS31,
        labels: ["LABEL1", "LABEL2", "LABEL3"]
        importance: 2
    }
}`;
        const dataString = `[${placesWithoutCachedAnalysis.map(place => place.title).join(", ")}]
        
DESCRIPTIONS:

${placesWithoutCachedAnalysis.map(place => `* ${place.title}: ${place.snippet || place.description || place.type || ""}`).join("\n\n")}
`;
        console.log(instructions);
        console.log(dataString);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system", content: instructions,
                },
                {
                    role: "user",
                    content: dataString,
                },
            ],
            response_format: { "type": "json_object" }
        });
        const json = JSON.parse(completion.choices[0].message.content);
        console.log('Analysis result:', json);
        // update cache
        Object.entries(json).forEach(([title, results]) => {
            // ignore potential brackets in titles
            const title2 = title.replace(/ *\([^)]*\) */g, "");
            const place = $places.find(place => place.title.replace(/ *\([^)]*\) */g, "") === title2);
            if (!place) {
                return;
            }
            analysisCache[place.title] = results;
        });
    }
    const newPlaces = $places.map(place => ({
        ...place,
        labels: analysisCache[place.title]?.labels,
        cls: analysisCache[place.title]?.cls,
        importance: analysisCache[place.title]?.importance
    }));
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
        model: "gpt-4o-mini",
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

// ----------------------------------------------

// generate story about the user position
export async function generateStory(storyTexts) {
    if (!storyTexts) {
        storyTexts = [];
    }
    const initialMessage = {
        role: "system", content: `
You are a city guide: friendly and helpful, concise and factual.

Tell something interesting about the user's current position. Answer in language '${get(preferences).lang}'.

# The user's current position is:

${get(coordinates).address}

# The position is close to /in:

${get(placesHere).map(place =>
            `## ${place.title}: ${place.labels?.join(", ")}    	    
Importance: ${place.importance}

${place.facts || place.article || place.description || place.snippet || place.type || ""}
`).join("\n")
            }

# Nearby places are:

                ${get(placesNearby).map(place =>
                `
## ${place.title} (${place.dist}m): ${place.labels?.join(", ")}
Importance: ${place.importance}
    
${place.facts || place.article || place.description || place.snippet || place.type || ""}
`).join("\n")
            }

# The user is in:

${get(placesSurrounding).map(place => `## ${place.title}
    
${place.facts || place.article || place.description || place.snippet || place.type || ""}
    `).join("\n")}


----------------------------------------------

# IMPORTANT INSTUCTIONS:

User's preferences are the following topics:
${get(preferences).labels?.map(label => `- ${label}`).join("\n")}

The story should be up to ${Math.min(Math.round(0.5 + (get(placesHere).length + get(placesSurrounding).length) / 3), 4)} paragraphs long and focus on the position of the user and the most closest places. Avoid giving precise directions or distances.

Keep the language concise and factual. You may use an informal tone, but use a moderate language. Try to realisticially describe the relevance of places. 

Just give summary of the most important information, but do not reply to the user's questions. Do not welcome the user or ask for feedback.
`,
    };
    console.log(initialMessage.content);
    let messages = [initialMessage, ...storyTexts.map(text => ({ role: "assistant", content: text }))];
    if (storyTexts.length > 0) {
        messages.push({
            role: "system", content: `Tell the user more about something different. You may focus on something specific, but never repeat yourself.

Remember, the user is at this position:
${get(coordinates).address
                }

The position is close to/in:
${get(placesHere).map(place =>
                    `* ${place.title}: ${place.labels?.join(", ")}`
                ).join("\n")
                }

Write one to two paragraphs of text. Give the text a headline marked in bold font.
` });
        console.log(messages[messages.length - 1].content);
    }
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
    });
    textToSpeech(completion.choices[0].message.content);
    return completion.choices[0].message.content;
}

// ----------------------------------------------

// extract and list historic events 
export async function extractHistoricEvents() {
    let relevantPlaces = get(placesHere).filter(place => place.importance > 3);
    if (relevantPlaces.length < 2) {
        relevantPlaces.push(...get(placesSurrounding));
    }
    const instructions = `You are a chat assistant helping a user to extract historic events for nearby places.

Extract and list historic events from the following text descring nearby places. 

Put more emphasis on higher rated places. Answer in language '${get(preferences).lang}'.

${relevantPlaces.map(place =>
        `# ${place.title}: ${place.labels?.join(", ")}
Importance: ${place.importance}` +
        `${place.article || place.description || place.snippet || place.type || ""}`
    ).join("\n\n")
        }

Only output a list of events in ascending temporal as bullet points in the following format:

- **DATE 1:** EVENT 1
- **DATE 2:** EVENT 2

Skip events if they are not immediately relevant for the specific, narrower place, especially early events from stone age, middle ages, or similar. Prefer truely local events of the very specific place, over those that affect the whole town or region.

Remember, the user is at this position:
${get(coordinates).address
        }
                
If the list of places is empty or the text is too short, output that no events could be found.
`;
    console.log(instructions);
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system", content: instructions,
            },
        ]
    });
    console.log(completion.choices[0].message.content);
    return completion.choices[0].message.content;
}

export async function extractFactsFromArticle(article) {
    const instructions = `You are a chat assistant helping a user to extract facts from an article, relevant when visiting the place.

Return a list of bullet points, focusing on the most important facts. Answer in language '${get(preferences).lang}'.    
`;
    console.log(instructions);
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system", content: instructions,
            },
            {
                role: "user", content: article,
            },
        ]
    });
    console.log(completion.choices[0].message.content);
    return completion.choices[0].message.content;
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
    console.log('text to speech:', text);
    const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
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