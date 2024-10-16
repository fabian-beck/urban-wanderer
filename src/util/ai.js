import OpenAI from "openai";
import { OPENAI_API_KEY } from "../.openai_api_key.js";
import { placesHere, placesNearby, coordinates, preferences, places, } from "../stores.js";
import { get } from "svelte/store";
import { LABELS, CLASSES, lang } from "../constants.js";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

const analysisCache = {};

// TODO: Support cases where two places have the same title, e.g., http://localhost:5173/?lat=48.85882&lon=10.41824
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
* exactly one class and
* up to three labels.
* one importance value.

For a list of places [A, B, C] and their descriptions output a JSON object like this:

{
    "A": {
        class: "CLASS1",
        labels: ["LABEL1", "LABEL2"]
        importance: 5
    },
    "B": {
        class: "CLASS2",
        labels: ["LABEL3"]
        importance: 3
    },
    "C": {
        class: "CLASS31,
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
        Object.entries(json).forEach(([title, labels]) => {
            const place = $places.find(place => place.title === title);
            if (!place) {
                return;
            }
            analysisCache[place.title] = labels;
        });
    }
    const newPlaces = $places.map(place => ({
        ...place,
        labels: analysisCache[place.title]?.labels,
        class: analysisCache[place.title]?.class,
        importance: analysisCache[place.title]?.importance
    }));
    const nonGeoClasses = Object.keys(CLASSES).filter(classLabel => CLASSES[classLabel]?.nonGeo);
    places.set(newPlaces.filter(place => !nonGeoClasses.includes(place.class)));
}

// summarize article
export async function summarizeArticle(article) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system", content: `You are a chat assistant providing a summary description for a place.
                
                Describe the following place in one sentence.Answer in language '${lang}'.

    ${article} `,
            },
        ]
    });

    return completion.choices[0].message.content;
}

// generate story about the user position
export async function generateStory(storyTexts) {
    if (!storyTexts) {
        storyTexts = [];
    }
    const initialMessage = {
        role: "system", content: `
You are a city guide: friendly and helpful, concise and factual.

Tell something interesting about the user's current position. Answer in language '${lang} '.

User's current position is:
${get(coordinates).address}

The position is close to /in (most important!):

${get(placesHere).map(place =>
            `# ${place.title}: ${place.labels?.join(", ")}    	    
Rating: ${place.rating}

${place.article || place.description || place.snippet || place.type || ""}
`).join("\n")
            }

Nearby places are (less important!):

                ${get(placesNearby).map(place =>
                `
# ${place.title} (${place.dist}m): ${place.labels?.join(", ")}
Rating: ${place.rating}
    
${place.article || place.description || place.snippet || place.type || ""}
`).join("\n")
            }}

----------------------------------------------

    IMPORTANT:

User's preferences are the following topics:
${get(preferences).labels?.map(label => `- ${label}`).join("\n")}

The story should be two to three paragraphs long and focus on the position of the user and the most closest places. Avoid giving precise directions or distances.

Keep the language concise and factual. You may use an informal tone, but use a moderate language. Try to realisticially describe the relevance of places. 

Just give summary of the most important information, but do not reply to the user's questions. Do not welcome the user or ask for feedback.

Return HTML formatted text. Highlight the places in the text in bold with HTML syntax (through "<strong>PLACE</strong>").
`,
    };
    console.log(initialMessage.content);
    let messages = [initialMessage, ...storyTexts.map(text => ({ role: "system", content: text }))];
    if (storyTexts.length > 0) {
        messages.push({
            role: "user", content: `Tell me more about something different. You may focus on a certain aspect.

Remember, I am at this position:
${get(coordinates).address
                }

The position is close to /in:
${get(placesHere).map(place =>
                    `* ${place.title}: ${place.labels?.join(", ")}`
                ).join("\n")
                }
` });
        console.log(messages[messages.length - 1]);
    }
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
    });
    return completion.choices[0].message.content;
}
