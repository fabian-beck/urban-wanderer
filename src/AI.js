import OpenAI from "openai";
import { OPENAI_API_KEY } from "./.openai_api_key.js";
import { places } from "./stores.js";
import { get } from "svelte/store";
import { LABELS, lang } from "./constants.js";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

const labelsCache = {};

// label places
export async function labelPlaces() {
    // get places with cached labels (labelsCache)
    const placesWithoutCachedLabels = get(places).filter(place => !labelsCache[place.pageid]);

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
            const place = get(places).find(place => place.title === title);
            if (!place) {
                return;
            }
            labelsCache[place.pageid] = labels;
        });
    }

    // update places
    const labels = get(places).map(place => labelsCache[place.pageid]);
    places.setLabels(labels);
}

// summarize article
export async function summarizeArticle(article) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system", content: `You are a chat assistant summarizing an article.
                
                Summarize the following article in one sentence. Answer in language '${lang}'.
                
                ${article}`,
            },
        ]
    });

    return completion.choices[0].message.content;
}