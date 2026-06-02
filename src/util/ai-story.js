import { openai, getAiModel } from './ai-core.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';

// generate story about the user position
export async function generateStory(
	storyTexts,
	placesHere,
	placesNearby,
	placesSurrounding,
	coordinates,
	preferences,
	previousResponseId = null
) {
	if (!storyTexts) {
		storyTexts = [];
	}
	const prioritizedNearbyPlaces = [...placesNearby]
		.sort((a, b) => (a.dist || Infinity) - (b.dist || Infinity))
		.slice(0, 5);
	const immediateNearbyPlaces = prioritizedNearbyPlaces.filter(
		(place) => (place.dist || Infinity) <= 500
	);
	const relevantNearbyPlaces =
		immediateNearbyPlaces.length > 0 ? immediateNearbyPlaces : prioritizedNearbyPlaces.slice(0, 2);
	const preferenceLabels = preferences.labels?.length
		? preferences.labels.map((label) => `- ${label}`).join('\n')
		: '- no specific topics selected';
	const initialMessage = {
		role: 'system',
		content: `
You are a city guide: ${preferences.guideCharacter}, and always concise and factual.

Tell something interesting about the user's current position. Answer in language '${preferences.lang}'.

# The user's current position is:

${coordinates.address}

# The position is close to /in:

${placesHere
	.map(
		(place) =>
			`## ${place.title}: ${place.labels?.join(', ')}    	    
Rating: ${place.stars}

${place.insights || place.article || place.description || place.snippet || place.type || ''}
`
	)
	.join('\n')}

# Nearby places are:

${relevantNearbyPlaces
	.map(
		(place) =>
			`
## ${place.title} (${place.dist}m): ${place.labels?.join(', ')}
Rating: ${place.stars}
    
${place.description || place.snippet || place.type || ''}
`
	)
	.join('\n')}

# The user is in:

${placesSurrounding
	.map(
		(place) => `## ${place.title}
    
${place.insights || place.article || place.description || place.snippet || place.type || ''}
    `
	)
	.join('\n')}


----------------------------------------------

# IMPORTANT INSTUCTIONS:

User's preferences are the following topics:
${preferenceLabels}

The story should be up to ${Math.min(Math.round(0.5 + (placesHere.length + placesSurrounding.length) / 3), 4)} paragraphs long and focus on the user's immediate surroundings and the closest places.
Prioritize in this strict order: (1) current position and places listed as "close to /in", (2) surrounding context, (3) the nearby places list only if needed.
Nearby places are optional context only. Mention at most one nearby place in detail, and only if it is among the closest provided options.
Personalization is mandatory: focus on details that match the listed user preferences.
Do not focus on topics that are not listed in the user's preferences (for example, do not go deep into religious aspects unless religion is explicitly listed).
If no matching preference detail is available, prioritize neutral local facts about the immediate area.
Avoid giving directions or distances.

Keep the language as concise as possible and factual. 
You may use an informal tone, but use a moderate language.
Try to realisticially describe the relevance of places, but do not exaggerate; not all places are "famous" or "important".
Avoid generic claims like "this is a famous place" or "the place has a rich history".
Do not conclude paragraphs with a generic statements.

Just give summary of the most important information, but do not reply to the user's questions. 
Do not welcome the user or ask for feedback.
Do not mention the exact address and consider that GPS coordinates are not always exact.

Remember that you enact a ${preferences.guideCharacter} guide and take this role seriously towards exaggeration and over-enthusiasm.
Consider that the user is ${preferences.familiarity} with the area; select the facts and adapt the explanations accordingly.
`
	};
	let messages = [initialMessage];

	if (storyTexts.length > 0 && !previousResponseId) {
		for (let i = 0; i < storyTexts.length; i++) {
			messages.push(
				{ role: 'user', content: 'Tell me something interesting about this location.' },
				{ role: 'assistant', content: storyTexts[i] }
			);
		}
		messages.push({
			role: 'user',
			content: `Tell me more about something different at this location. You may focus on something specific, but never repeat yourself.

Remember, I am at this position:
${coordinates.address}

The position is close to /in:
${placesHere.map((place) => `* ${place.title}: ${place.labels?.join(', ')}`).join('\n')}

Strictly stick to the initially provided instructions and facts about the places.
Write one to three paragraphs of text. 
Give the text a headline marked in bold font.`
		});
	} else if (storyTexts.length === 0) {
		messages.push({
			role: 'user',
			content: 'Tell me something interesting about this location.'
		});
	} else {
		messages.push({
			role: 'user',
			content: `Tell me more about something different at this location. Focus on something specific, but never repeat yourself.

Write one to three paragraphs of text. 
Give the text a headline marked in bold font.`
		});
	}
	console.log('Story writing instructions', messages);
	const requestConfig = {
		model: getAiModel('advanced', preferences),
		store: true,
		reasoning: {
			effort: AI_REASONING_EFFORT
		}
	};

	if (previousResponseId) {
		requestConfig.previous_response_id = previousResponseId;
		requestConfig.input = messages.slice(-1);
	} else {
		requestConfig.input = messages;
	}

	const response = await openai.responses.create(requestConfig);

	return {
		text: response.output_text,
		responseId: response.id
	};
}
