import OpenAI from "openai";
import { OPENAI_API_KEY } from "../.openai_api_key.js";
import { placesHere, placesNearby, coordinates, preferences, places, placesSurrounding } from "../stores.js";
import { get } from "svelte/store";
import { LABELS, lang } from "../constants.js";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

const labelsCache = {};

// label places
export async function labelPlaces() {
    const $places = get(places);
    // get places with cached labels (labelsCache)
    const placesWithoutCachedLabels = $places.filter(place => !labelsCache[place.pageid]);

    if (placesWithoutCachedLabels.length > 0) {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system", content: `You are a chat assistant helping a user label places.
                
                Available labels are:
                ${LABELS.map(label => `- ${label}`).join("\n")}

                Answer with up to three labels that best describes the place.
                
                For a list of places [A, B, C] output a JSON object like this:
            
                {
                    "A": ["LABEL1", "LABEL2"],
                    "B": ["LABEL1"],
                    "C": ["LABEL2", "LABEL3", "LABEL4"]
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
            const place = $places.find(place => place.title === title);
            if (!place) {
                return;
            }
            labelsCache[place.pageid] = labels;
        });
    }
    places.set($places.map(place => ({ ...place, labels: labelsCache[place.pageid] })));
}

// rate places based on their impact and importance to the user's environment 
// return a list of places with their ratings
export async function ratePlaces() {
    const $places = get(places);
    const instructions = `You are a chat assistant helping a user rate places based on their impact and importance to the user's environment.

Rate the following places based on their impact and importance for its immediate geographic environment. For instance:
* a bigger river is more important than a smaller one
* a university is more important than a school
* a bigger building is more important than a smaller one
* a church is more important than a chapel
* a big factory is more important than a small office building
* a historic building is more important than a modern one
* a park or harbor covers an area, hence more important than a single building

Assign each place a rating from 1 to 5, where 1 is the lowest and 5 is the highest. If you are unsure, you can skip the place.

${$places.map(place => `# ${place.title}: ${place.labels?.join(", ")}\n`).join("\n")}

Background information on the places:
${$places.map(place => `${place.article}\n`).join("\n")}

Return a JSON object, for instance, like this for a list of places [A, B, C]:
    {
        "A": 4,
        "B": 3,
        "C": 5
    }`;

    console.log(instructions);

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system", content: instructions,
            },
        ],
        response_format: { "type": "json_object" }
    });

    console.log(completion.choices[0].message.content);
    const json = JSON.parse(completion.choices[0].message.content);
    places.set($places.map(place => ({ ...place, rating: json[place.title] })));
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
You are a city guide.

Generate a story about the user's current position. Answer in language '${lang} '.

User's current position is:
${get(coordinates).address}

The position is close to /in (most important!):

${get(placesHere).map(place =>
            `# ${place.title}: ${place.labels?.join(", ")}    	    
Rating: ${place.rating}

${place.article}
`).join("\n")
            }

Nearby places are (less important!):

                ${get(placesNearby).map(place =>
                `
# ${place.title} (${place.dist}m): ${place.labels?.join(", ")}
Rating: ${place.rating}
    
${place.article}
`).join("\n")
            }}

----------------------------------------------

    IMPORTANT:

User's preferences are the following topics:
${get(preferences).labels?.map(label => `- ${label}`).join("\n")}

The story should be two to three paragraphs long and focus on the position of the user and the most closest places. Avoid giving precise directions or distances.

Keep the language concise and factual. You may use an informal tone, but do not exaggerate the importance of places. Avoid assessing the quality of the places.

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
        model: "gpt-4o-mini",
        messages: messages,
    });
    return completion.choices[0].message.content;
}
