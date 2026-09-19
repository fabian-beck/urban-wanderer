import { openai, getAiModel } from './ai-core.js';
import { AI_REASONING_EFFORT, LABELS } from '../constants/ui-config.js';
import { createLogger } from './logger.js';
import {
	buildWalkPromptContext,
	buildWalkRecapContext,
	getPreviouslyVisitedIdentities
} from './walk.js';
import { getPlaceIdentity } from './place-identity.js';

const logger = createLogger('ai.story');

// generate story about the user position
export async function generateStory(
	storyTexts,
	placesHere,
	placesNearby,
	placesSurrounding,
	coordinates,
	preferences,
	previousResponseId = null,
	walk = null
) {
	if (!storyTexts) {
		storyTexts = [];
	}
	const walkContext = buildWalkPromptContext(walk);
	const visitedIdentities = getPreviouslyVisitedIdentities(walk);
	const visitedNote = (place) =>
		visitedIdentities.has(getPlaceIdentity(place)) ? ' [already visited earlier on this walk]' : '';
	const prioritizedNearbyPlaces = [...placesNearby]
		.sort((a, b) => (a.dist || Infinity) - (b.dist || Infinity))
		.slice(0, 5);
	const immediateNearbyPlaces = prioritizedNearbyPlaces.filter(
		(place) => (place.dist || Infinity) <= 500
	);
	const relevantNearbyPlaces =
		immediateNearbyPlaces.length > 0 ? immediateNearbyPlaces : prioritizedNearbyPlaces.slice(0, 2);
	const selectedLabels = preferences.labels || [];
	const preferenceLabels = selectedLabels.length
		? selectedLabels.map((label) => `- ${label}`).join('\n')
		: '- no specific topics selected';
	const deselectedLabels = LABELS.map((label) => label.value).filter(
		(label) => !selectedLabels.includes(label)
	);
	const negativePreferenceLabels = deselectedLabels.length
		? deselectedLabels.map((label) => `- ${label}`).join('\n')
		: '- none';
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
			`## ${place.title}${visitedNote(place)}: ${place.labels?.join(', ')}
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
## ${place.title}${visitedNote(place)} (${place.dist}m): ${place.labels?.join(', ')}
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

${walkContext}

----------------------------------------------

# IMPORTANT INSTUCTIONS:

User's preferences are the following topics:
${preferenceLabels}

User did NOT select the following topics (treat them as negative topics and avoid them unless necessary for local context):
${negativePreferenceLabels}

The story should be up to ${Math.min(Math.round(0.5 + (placesHere.length + placesSurrounding.length) / 3), 4)} paragraphs long and focus on the user's immediate surroundings and the closest places.
Prioritize in this strict order: (1) current position and places listed as "close to /in", (2) surrounding context, (3) the nearby places list only if needed.
Nearby places are optional context only. Mention at most one nearby place in detail, and only if it is among the closest provided options.
Personalization is mandatory: focus on details that match the listed user preferences.
Do not focus on topics that are not listed in the user's preferences (for example, do not go deep into religious aspects unless religion is explicitly listed).
If no matching preference detail is available, prioritize neutral local facts about the immediate area.
Avoid giving directions or distances.
${
	walkContext
		? `
The user is on a walk: treat the stops as one continuous narrative. Never repeat facts already told in the earlier stories of this walk.
Prefer places the user has not visited yet; mention a place marked as already visited only briefly and acknowledge that the user has been there.
You may draw one short connection between the current position and an earlier stop of the walk when it adds insight.
`
		: ''
}
Keep the language as concise as possible and factual. 
You may use an informal tone, but use a moderate language.
Try to realisticially describe the relevance of places, but do not exaggerate; not all places are "famous" or "important".
Avoid generic claims like "this is a famous place" or "the place has a rich history".
Do not end paragraphs with generic conclusion statements.
End each paragraph with a concrete, place-specific detail.

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
${placesHere.map((place) => `* ${place.title}${visitedNote(place)}: ${place.labels?.join(', ')}`).join('\n')}

Strictly stick to the initially provided instructions and facts about the places.
Avoid generic conclusion statements and end with a concrete place-specific detail.
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

Avoid generic conclusion statements and end with a concrete place-specific detail.
Write one to three paragraphs of text. 
Give the text a headline marked in bold font.`
		});
	}
	logger.info('Generating story', {
		existingStories: storyTexts.length,
		here: placesHere.length,
		nearby: placesNearby.length,
		surrounding: placesSurrounding.length,
		usesPreviousResponse: Boolean(previousResponseId),
		walkStops: walk?.stops?.length || 0
	});
	logger.debug('Story prompt', { messages });
	const requestConfig = {
		model: getAiModel('advanced', preferences),
		store: true,
		reasoning: {
			effort: AI_REASONING_EFFORT.STORY
		}
	};

	if (previousResponseId) {
		requestConfig.previous_response_id = previousResponseId;
		requestConfig.input = messages.slice(-1);
	} else {
		requestConfig.input = messages;
	}

	const response = await openai.responses.create(requestConfig);
	logger.info('Story generated', {
		characters: response.output_text.length,
		responseId: response.id
	});

	return {
		text: response.output_text,
		responseId: response.id
	};
}

// synthesize the walk so far: highlights, cross-stop connections, timeline, missed places, open threads
export async function generateWalkRecap(walk, preferences) {
	const instructions = `
You are a city guide: ${preferences.guideCharacter}, and always concise and factual.

The user asks for a recap of the walk so far. Answer in language '${preferences.lang}'.
Your value is synthesis across stops: say what no single stop could tell. Do not retell the stops in order.

${buildWalkRecapContext(walk, preferences)}

----------------------------------------------

# IMPORTANT INSTRUCTIONS:

Fill the JSON fields as follows; use only the material given above and never invent facts.
- headline: a short, specific title for this walk (no markdown).
- highlights: two to four visited places that matter most for the user's interests, ordered by relevance. "title" must be the exact title of a visited place; "text" gives one or two sentences with a concrete detail why this place stood out for this user.
- connections: one to three threads that link at least two different stops or places (shared persons, eras, building styles, events, landscape, institutions). "title" names the thread; "text" explains it in two or three sentences and names the places involved. Leave the list empty if the material does not support a real connection.
- timeline: up to eight dated entries ordered by year ascending, drawn from the historic events and place facts above and tied to visited places or the walked area; "year" is a number (BC negative), "date_string" a readable date or range, "text" one sentence. Leave empty if no dates are available.
- missed: up to three passed-by places from the list above that fit the user's interests and are worth a return visit. "title" must be the exact listed title; "text" one sentence why.
- openThreads: up to three short questions or things to look up later that this walk raised, each anchored in a named place.

Address the user directly and write in past tense where you refer to the walk.
Avoid generic praise and generic conclusions; every sentence should carry a concrete detail.
Remember that you enact a ${preferences.guideCharacter} guide and take this role seriously towards exaggeration and over-enthusiasm.
`;
	logger.info('Generating walk recap', {
		stops: walk.stops.length,
		visitedPlaces: walk.visitedPlaces.length,
		stories: walk.stories.length
	});
	logger.debug('Walk recap prompt', { instructions });
	const titledEntry = {
		type: 'object',
		properties: {
			title: { type: 'string' },
			text: { type: 'string' }
		},
		required: ['title', 'text'],
		additionalProperties: false
	};
	const response = await openai.responses.create({
		model: getAiModel('advanced', preferences),
		reasoning: {
			effort: AI_REASONING_EFFORT.WALK_RECAP
		},
		input: [{ role: 'system', content: instructions }],
		text: {
			format: {
				type: 'json_schema',
				name: 'walk_recap',
				schema: {
					type: 'object',
					properties: {
						headline: { type: 'string' },
						highlights: { type: 'array', items: titledEntry },
						connections: { type: 'array', items: titledEntry },
						timeline: {
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
						},
						missed: { type: 'array', items: titledEntry },
						openThreads: { type: 'array', items: { type: 'string' } }
					},
					required: ['headline', 'highlights', 'connections', 'timeline', 'missed', 'openThreads'],
					additionalProperties: false
				}
			}
		}
	});
	const recap = JSON.parse(response.output_text);
	logger.info('Walk recap generated', {
		highlights: recap.highlights.length,
		connections: recap.connections.length,
		timeline: recap.timeline.length,
		missed: recap.missed.length
	});
	return recap;
}
