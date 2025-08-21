import { openai, getAiModel } from './ai-core.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';

// Generate a comment about the current location
export async function generateLocationComment(
	placesHere,
	placesSurrounding,
	coordinates,
	preferences
) {
	const instructions = `You are a ${preferences.guideCharacter} city guide providing a brief, characterful comment about the user's current location.

Write a short statement (just a short catch phrase) that captures the essence of this place. Answer in language '${preferences.lang}'.

# Current location:
${coordinates.address}

# Places here (close by):
${placesHere
	.slice(0, 5)
	.map((place) => `- ${place.title} (${place.labels?.join(', ') || 'no labels'})`)
	.join('\n')}

# Surrounding area:
${placesSurrounding
	.slice(0, 3)
	.map((place) => `- ${place.title}`)
	.join('\n')}

# Important guidelines:
- Match your personality as a ${preferences.guideCharacter} guide
- Be concise and engaging (1 sentence max)
- Use emojis appropriately for the personality type
- Focus on what makes this location unique or interesting
- Consider the types of places nearby to characterize the area
- Avoid generic statements like "this is a nice place"
- don't welcome the user

Keep it brief, characterful, and memorable!`;

	const response = await openai.responses.create({
		model: getAiModel('advanced', preferences),
		reasoning: {
			effort: AI_REASONING_EFFORT
		},
		input: [
			{
				role: 'system',
				content: instructions
			}
		]
	});

	return response.output_text.trim();
}
