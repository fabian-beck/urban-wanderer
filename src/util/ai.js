import OpenAI from "openai";
import { OPENAI_API_KEY } from "../.openai_api_key.js";
import { placesHere, placesNearby, coordinates, preferences, osmPlaces } from "../stores.js";
import { get } from "svelte/store";
import { LABELS, lang } from "../constants.js";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

const labelsCache = {};

// label places
export async function labelPlaces(places) {
    // get places with cached labels (labelsCache)
    const placesWithoutCachedLabels = places.filter(place => !labelsCache[place.pageid]);

    if (placesWithoutCachedLabels.length > 0) {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system", content: `You are a chat assistant helping a user label places.
                
                Available labels are:
                ${LABELS.map(label => `- ${label}`).join("\n")}

                Answer with up to three labels that best describes the place, but if possible you better answer with less than three labels.
                
                For a list of places [A, B, C] output a JSON object like this:
            
                {
                    "A": ["LABEL1", "LABEL2"],
                    "B": ["LABEL1"],
                    "C": ["LABEL2"]
                }`,

                },
                {
                    role: "user",
                    content: placesWithoutCachedLabels.map(place => place.title).join(","),
                },
            ],
            response_format: { "type": "json_object" }
        });

        const json = JSON.parse(completion.choices[0].message.content);

        // update cache
        Object.entries(json).forEach(([title, labels]) => {
            const place = places.find(place => place.title === title);
            if (!place) {
                return;
            }
            labelsCache[place.pageid] = labels;
        });
    }
    return places.map(place => labelsCache[place.pageid]);
}

// summarize article
export async function summarizeArticle(article) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system", content: `You are a chat assistant providing a summary description for a place.
                
                Describe the following place in one sentence. Answer in language '${lang}'.
                
                ${article}`,
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
You are a city guide.

Generate a story about the user's current position. Answer in language '${lang}'.

User's current position is:
${get(coordinates).address}

The position is close to/in (most important!):

${get(placesHere).map(place =>
            `# ${place.title}: ${place.labels.join(", ")}    	    

${place.article}
`).join("\n")}

Further places that are close are:
${get(osmPlaces).map(place =>
                `* ${place.title}`)
                .join("\n")}

Nearby places are(less important!):

                ${get(placesNearby).map(place =>
                    `
# ${place.title} (${place.dist}m): ${place.labels.join(", ")}
    
${place.article}
`).join("\n")
            }}

----------------------------------------------

IMPORTANT:

User's preferences are the following topics:
${get(preferences).labels.map(label => `- ${label}`).join("\n")}

The story should be two to three paragraphs long and focus on the position of the user and the most closest places. Avoid giving precise directions or distances.

Keep the languae concise and factual. You may use an informal tone, but do not exaggerate the importance of places. Avoid assessing the quality of the places.

Just give summary of the most important information, but do not reply to the user's questions.

Return HTML formatted text. You may highlight the places in the text in bold (through "<b>PLACE</b>").
`,
    };
    console.log(initialMessage.content);
    let messages = [initialMessage, ...storyTexts.map(text => ({ role: "system", content: text }))];
    if (storyTexts.length > 0) {
        messages.push({
            role: "user", content: `Tell me more about something different.You may focus on a certain aspect.

Remember to connect the story to the user's current position:
${get(coordinates).address
                }

The position is close to /in:
${get(placesHere).map(place =>
                    `* ${place.title}: ${place.labels.join(", ")}`
                ).join("\n")
                }
` });
        console.log(messages[messages.length - 1]);
    }
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
    });
    return completion.choices[0].message.content;
}
