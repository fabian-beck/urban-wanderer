import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../.openai_api_key.js';
import {
    placesHere,
    placesNearby,
    coordinates,
    preferences,
    places,
    placesSurrounding,
    audioState
} from '../stores.js';
import { get } from 'svelte/store';
import { LABELS, CLASSES, AI_MODELS } from '../constants.js';
import { getWikidataContext } from './wikidata.js';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

let audio = null;

// Helper function to get AI model with fallback
function getAiModel(type) {
    const prefs = get(preferences);
    if (type === 'simple') {
        return prefs?.aiModelSimple || AI_MODELS.DEFAULT_SIMPLE;
    } else if (type === 'advanced') {
        return prefs?.aiModelAdvanced || AI_MODELS.DEFAULT_ADVANCED;
    }
    return AI_MODELS.DEFAULT_SIMPLE;
}

// ----------------------------------------------

async function translatePlaceName(place) {
    const prefs = get(preferences);
    const hasMultipleSourceLanguages = prefs.sourceLanguages && prefs.sourceLanguages.length > 1;
    const isDifferentLanguage = place.lang && place.lang !== prefs.lang;

    // Only translate if source from multiple languages are considered or presentation language not equals source language
    if (!hasMultipleSourceLanguages && !isDifferentLanguage) {
        return { title: place.title, translation: place.title };
    }

    const instructions = `You are a chat assistant helping a user to translate place names to ${prefs.lang}.

You must skip places that are difficult to translate or are already in the targeted language (${prefs.lang}). 
Generally, skip place names in English.

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
    const response = await openai.responses.create({
        model: getAiModel('simple'),
        reasoning: {
            effort: 'minimal'
        },
        input: [
            { role: 'system', content: instructions },
            { role: 'user', content: place.title }
        ],
        text: {
            format: {
                type: 'json_schema',
                name: 'translation',
                schema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        translation: { type: 'string' }
                    },
                    required: ['title', 'translation'],
                    additionalProperties: false
                },
                strict: true
            }
        }
    });
    const translation = JSON.parse(response.output_text);
    return translation;
}

export async function groupDuplicatePlaces() {
    const $places = get(places);
    const translations = await Promise.all($places.map((place) => translatePlaceName(place)));
    console.log('Translations:', translations);

    const levenshtein = (a, b) => {
        const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1));

        for (let i = 0; i <= a.length; i++) dp[i][0] = i;
        for (let j = 0; j <= b.length; j++) dp[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1, // deletion
                    dp[i][j - 1] + 1, // insertion
                    dp[i - 1][j - 1] + cost // substitution
                );
            }
        }

        return dp[a.length][b.length];
    };

    const placesNameIsSimilar = (name1, name2) => {
        // if names contain numbers, compare them based on the numbers
        const numbers1 = name1.match(/\d+/g) || [];
        const numbers2 = name2.match(/\d+/g) || [];
        if (numbers1.length > 0 || numbers2.length > 0) {
            const number1 = numbers1.join('');
            const number2 = numbers2.join('');
            if (number1 != number2) {
                return false;
            }
        }
        // lower case names
        name1 = name1.toLowerCase();
        name2 = name2.toLowerCase();
        // remove content in brackets
        name1 = name1.replace(/ *\([^)]*\) */g, '');
        name2 = name2.replace(/ *\([^)]*\) */g, '');
        // remove special characters
        name1 = name1.replace(/[^a-z0-9]/g, '');
        name2 = name2.replace(/[^a-z0-9]/g, '');
        // remove town name from place name (if place name significantly longer than town name)
        const townName = get(coordinates)?.town?.toLowerCase();
        if (townName && name1.length > townName.length + 5) {
            name1 = name1.replace(townName, '');
        }
        if (townName && name2.length > townName.length + 5) {
            name2 = name2.replace(townName, '');
        }
        const allowedDistance =
            Math.max(name1.length, name2.length) / 4 +
            (Math.max(name1.length, name2.length) - Math.min(name1.length, name2.length)) / 4;
        if (levenshtein(name1, name2) < allowedDistance && levenshtein(name1, name2) > 0) {
            console.log(
                'Levenshtein distance:',
                levenshtein(name1, name2),
                name1,
                name2,
                allowedDistance
            );
        }
        return name1 === name2 || levenshtein(name1, name2) < allowedDistance;
    };

    const newPlaces = [];
    for (const place of $places) {
        const translation = translations.find((translation) =>
            placesNameIsSimilar(place.title, translation.title)
        );
        if (translation && translation.translation !== place.title) {
            place.title = `${translation.translation} (${place.title})`;
        }
        const previousPlace = newPlaces.find((p) => placesNameIsSimilar(p.title, place.title));
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
${Object.keys(CLASSES)
            .map((classLabel) => `- ${classLabel}: ${CLASSES[classLabel].description}`)
            .join('\n')}
        
Available LABELS are:
${LABELS.map((label) => `- ${label.value}: ${label.description}`).join('\n')}

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
* the place is built over or is not visible anymore

To best best characterize the place answer with 
* exactly one class,
* up to three labels, and
* one importance value.

For a place "A" and its description output a JSON object like this:

{
    "cls": "CLASS1",
    "labels": ["LABEL1", "LABEL2"],
    "importance": 5
}
    
FURTHER INSTRUCTIONS:
* Geographic places like rivers or lakes, that are not a specific location, should be labeled only as "GEOGRAPHY" and have a very low importance as they can be accessed from many locations.
`;
    const dataString = `* ${place.title}  (${place.type || ''}): ${place.snippet || place.description || ''}`;
    // console.log("Place analysis instructions", [instructions, dataString]);
    const response = await openai.responses.create({
        model: getAiModel('simple'),
        reasoning: {
            effort: 'minimal'
        },
        input: [
            {
                role: 'system',
                content: instructions
            },
            {
                role: 'user',
                content: dataString
            }
        ],
        text: {
            format: {
                type: 'json_object'
            }
        }
    });
    let json;
    try {
        // Extract JSON from response, handling potential extra text
        const text = response.output_text.trim();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonText = jsonStart !== -1 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd) : text;
        json = JSON.parse(jsonText);
    } catch (parseError) {
        console.error('JSON parse error for place:', place.title);
        console.error('Response text:', response.output_text);
        console.error('Parse error:', parseError);
        // Fallback to empty analysis
        json = { cls: 'other', labels: [], importance: 0 };
    }
    // update cache
    analysisCache[place.title] = json;
}

// ToDo: Support cases where two places have the same title, e.g., http://localhost:5173/?lat=48.85882&lon=10.41824
export async function analyzePlaces() {
    const $places = get(places);
    console.log('Places before analysis:', $places);
    // get places with cached labels (labelsCache)
    const placesWithoutCachedAnalysis = $places.filter((place) => !analysisCache[place.title]);
    if (placesWithoutCachedAnalysis.length > 0) {
        // analyze each place separately, but concurrently
        await Promise.all(placesWithoutCachedAnalysis.map((place) => analyzeSinglePlace(place)));
    }
    const newPlaces = $places.map((place) => ({
        ...place,
        labels: analysisCache[place.title]?.labels,
        cls: analysisCache[place.title]?.cls,
        importance: analysisCache[place.title]?.importance
    }));
    // remove non-geographic classes
    const nonGeoClasses = Object.keys(CLASSES).filter((classLabel) => CLASSES[classLabel]?.nonGeo);
    places.set(newPlaces.filter((place) => !nonGeoClasses.includes(place.cls)));
}

// ----------------------------------------------

// summarize article
const summaryCache = {};
export async function summarizeArticle(article) {
    if (summaryCache[article]) {
        return summaryCache[article];
    }
    const response = await openai.responses.create({
        model: getAiModel('simple'),
        reasoning: {
            effort: 'minimal'
        },
        input: [
            {
                role: 'system',
                content: `You are a chat assistant providing a summary description for a place.

                Describe the following place in a short paragraph. Answer in language '${get(preferences).lang}'.
${article} `
            }
        ]
    });
    const summary = response.output_text;
    summaryCache[article] = summary;
    return summary;
}


// search for a data facts about a place
export async function searchPlaceFacts(place, factsProperties) {
    // Get WikiData context using the new utility
    const wikidataContext = await getWikidataContext(place);

    const initialMessage = `
You are a chat assistant helping a user to find facts about a place in the provided JSON format.

The place of interest is ${place.title} (${place.cls}) located near ${get(coordinates).address}. 

Extract and search for relevant facts and data about the place. Answer in language '${get(preferences).lang}'.

The facts should be relevant for a current touristic visitor of the place. 
Avoid redundancies; do not repeat the same information in different ways in properties and other facts.
Directions, address, location are not necessary as the user is at the place already. 
Avoid any general description of the place and do not provide general information about the city or region. 
Use null for missing values.
Keep the language as concise as possible and factual, do not use acronyms or abbreviations. 
Descriptions should not be full sentences, but short phrases or single words.
Use unicode icons for properties where possible, e.g., 🏛️ for "building", 🏞️ for "park", etc.
Keep list short or empty if there are no relevant facts.

You may use the following sources of information about the place:
${place.article || place.description || place.snippet || '[no description available]'}${wikidataContext}
`;
    console.log('Search facts instructions', [initialMessage]);
    const response = await openai.responses.create({
        model: getAiModel('advanced'),
        reasoning: {
            effort: 'minimal'
        },
        input: initialMessage,
        text: {
            format: {
                type: 'json_schema',
                name: 'facts',
                schema: {
                    type: 'object',
                    properties: {
                        facts: {
                            type: 'object',
                            properties: factsProperties,
                            required: Object.keys(factsProperties),
                            additionalProperties: false
                        }
                    },
                    required: ['facts'],
                    additionalProperties: false
                }
            }
        }
    });
    console.log('Search fact response:', JSON.parse(response.output_text).facts);
    return JSON.parse(response.output_text).facts;
}

// ----------------------------------------------

// generate story about the user position
export async function generateStory(storyTexts) {
    if (!storyTexts) {
        storyTexts = [];
    }
    const initialMessage = {
        role: 'system',
        content: `
You are a city guide: ${get(preferences).guideCharacter}, and always concise and factual.

Tell something interesting about the user's current position. Answer in language '${get(preferences).lang}'.

# The user's current position is:

${get(coordinates).address}

# The position is close to /in:

${get(placesHere)
                .map(
                    (place) =>
                        `## ${place.title}: ${place.labels?.join(', ')}    	    
Rating: ${place.stars}

${place.facts || place.article || place.description || place.snippet || place.type || ''}
`
                )
                .join('\n')}

# Nearby places are:

${get(placesNearby)
                .map(
                    (place) =>
                        `
## ${place.title} (${place.dist}m): ${place.labels?.join(', ')}
Rating: ${place.stars}
    
${place.facts || place.article || place.description || place.snippet || place.type || ''}
`
                )
                .join('\n')}

# The user is in:

${get(placesSurrounding)
                .map(
                    (place) => `## ${place.title}
    
${place.facts || place.article || place.description || place.snippet || place.type || ''}
    `
                )
                .join('\n')}


----------------------------------------------

# IMPORTANT INSTUCTIONS:

User's preferences are the following topics:
${get(preferences)
                .labels?.map((label) => `- ${label}`)
                .join('\n')}

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
`
    };
    let messages = [
        initialMessage,
        ...storyTexts.map((text) => ({ role: 'assistant', content: text }))
    ];
    if (storyTexts.length > 0) {
        messages.push({
            role: 'system',
            content: `Tell the user more about something different. You may focus on something specific, but never repeat yourself.

Remember, the user is at this position:
${get(coordinates).address}

The position is close to /in:
${get(placesHere)
                    .map((place) => `* ${place.title}: ${place.labels?.join(', ')}`)
                    .join('\n')}

Strictly stick to the initially provided instructions and facts about the places.
Write one to three paragraphs of text. 
Give the text a headline marked in bold font.
`
        });
    }
    console.log('Story writing instructions', messages);
    const response = await openai.responses.create({
        model: getAiModel('advanced'),
        reasoning: {
            effort: 'minimal'
        },
        input: messages
    });
    return response.output_text;
}

// ----------------------------------------------

// extract and list historic events
export async function extractHistoricEvents() {
    let relevantPlaces = get(placesHere).filter((place) => place.stars > 2);
    if (relevantPlaces.length < 2) {
        relevantPlaces.push(...get(placesSurrounding));
    }
    const instructions = `You are a chat assistant helping a user to extract historic events for nearby places.

Extract and list historic events from the following text descring nearby places. 

Put more emphasis on higher rated places. Answer in language '${get(preferences).lang}'.

${relevantPlaces
            .map(
                (place) =>
                    `# ${place.title}: ${place.labels?.join(', ')}
Rating: ${place.stars}` +
                    `${place.article || place.description || place.snippet || place.type || ''}`
            )
            .join('\n\n')}

Only output a list of events in ascending temporal in JSON format.If events refer to a time range, translate the range to the start year of the range("year"), but give the range description in "date_string".Years BC should be negative.

Skip events if they are not immediately relevant for the specific, narrower place, especially early events from stone age, middle ages, or similar.Prefer truely local events of the very specific place, over those that affect the whole town or region.

        Remember, the user is at this position:
${get(coordinates).address}
                
If the list of places is empty or the text is too short, leave the list of events empty.
`;
    console.log('Historic events instructions', [instructions]);
    const response = await openai.responses.create({
        model: getAiModel('advanced'),
        input: [
            {
                role: 'system',
                content: instructions
            }
        ],
        text: {
            format: {
                type: 'json_schema',
                name: 'event',
                schema: {
                    type: 'object',
                    properties: {
                        events: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    year: { type: 'number' },
                                    date_string: { type: 'string' },
                                    text: { type: 'string' }
                                },
                                required: ['year', 'date_string', 'text'],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ['events'],
                    additionalProperties: false
                }
            }
        }
    });
    console.log('Historic events response:', response.output_text);
    return JSON.parse(response.output_text).events;
}

export async function extractFactsFromArticle(article) {
    const instructions = `You are a chat assistant helping a user to extract facts from an article, relevant when visiting the place.

Return a list of bullet points, focusing on the most important facts. 
Answer in language '${get(preferences).lang}'.    
`;
    console.log('Extract facts instructions', [instructions]);
    const response = await openai.responses.create({
        model: getAiModel('simple'),
        reasoning: {
            effort: 'minimal'
        },
        input: [
            {
                role: 'system',
                content: instructions
            },
            {
                role: 'user',
                content: article
            }
        ]
    });
    console.log('Extract facts response:', [response.output_text]);
    return response.output_text;
}


export async function textToSpeech(text) {
    if (get(audioState) === 'playing') {
        audioState.set('paused');
        if (audio) {
            audio.pause();
        }
    }
    audioState.set('loading');
    console.log('Text to speech:', text);
    const instructions = `
You are ${get(preferences).guideCharacter} city guide and speak accordingly.
`;
    const response = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        instructions,
        speed: 1.2,
        input: text
    });
    const blob = await response.blob();
    if (audio) {
        audio.pause();
    }
    audio = new Audio(URL.createObjectURL(blob));
    if (get(audioState) === 'paused') {
        return;
    }
    document.querySelectorAll('audio').forEach((audio) => audio.pause());
    audioState.set('playing');
    audio.play();
    const unsubscribe = audioState.subscribe((state) => {
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
