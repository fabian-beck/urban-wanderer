export const LANGUAGES = [
	{ value: 'en', name: 'English' },
	{ value: 'de', name: 'German' }
];

// Wikipedia editions used as content sources (values are Wikipedia language codes)
export const SOURCE_LANGUAGES = [
	{ value: 'en', name: 'English' },
	{ value: 'de', name: 'German' },
	{ value: 'cs', name: 'Czech' }
];

// Paragraph budget of a story: the first story scales with the number of
// places here and surrounding, continuations use a fixed range.
export const STORY_LENGTH = {
	MIN_PARAGRAPHS: 2,
	MAX_PARAGRAPHS: 6,
	PLACES_PER_PARAGRAPH: 2,
	CONTINUATION_MIN_PARAGRAPHS: 2,
	CONTINUATION_MAX_PARAGRAPHS: 4
};

// Place description in the details modal: a short form that is always shown
// and an optional long form that expands on demand.
export const SUMMARY_LENGTH = {
	SHORT_MIN_SENTENCES: 2,
	SHORT_MAX_SENTENCES: 3,
	LONG_MIN_PARAGRAPHS: 1,
	LONG_MAX_PARAGRAPHS: 3
};

export const LABELS = [
	{
		value: 'ACTIVITIES',
		name: '🎯 Activities',
		description:
			'Shopping, food, recreational activities, entertainment venues, and leisure facilities'
	},
	{
		value: 'ARCHITECTURE',
		name: '🏛️ Architecture',
		description: 'Buildings, monuments, and architectural landmarks of interest'
	},
	{
		value: 'CULTURE',
		name: '🎨 Culture',
		description: 'Museums, galleries, cultural centers, and artistic venues'
	},
	{
		value: 'EDUCATION',
		name: '📚 Education',
		description: 'Schools, universities, libraries, and educational institutions'
	},
	{
		value: 'GEOGRAPHY',
		name: '🗺️ Geography',
		description: 'Natural formations, landscapes, and geographical features'
	},
	{
		value: 'HISTORY',
		name: '📜 History',
		description: 'Historical sites, memorials, and places of historical significance'
	},
	{
		value: 'NATURE',
		name: '🌿 Nature',
		description: 'Parks, gardens, natural areas, and environmental features'
	},
	{
		value: 'RELIGION',
		name: '⛪ Religion',
		description: 'Churches, temples, and other places of worship'
	},
	{
		value: 'SPORTS',
		name: '⚽ Sports',
		description: 'Sports facilities, stadiums, and athletic venues'
	},
	{
		value: 'TRANSPORTATION',
		name: '🚉 Transportation',
		description: 'Stations, airports, harbors, and transportation infrastructure'
	}
];

// The value is stored in the preferences and quoted in the prompts. germanAddress
// is the form of address in German texts; storyInstructions and commentInstructions
// take precedence over the general style rules of those prompts; storyLength
// overrides STORY_LENGTH.
export const GUIDE_CHARACTERS = [
	{ value: 'friendly and helpful', germanAddress: 'du' },
	{ value: 'funny and witty', germanAddress: 'du' },
	{ value: 'serious and professional', germanAddress: 'Sie' },
	{
		value: 'kid-friendly (enthusiastic and using simple terms)',
		germanAddress: 'du',
		storyInstructions: `The listener is a child of about 8 to 12 years, possibly together with their family. Write so that a child can follow when the text is read aloud:
- Use short sentences (rarely more than 12 words) and everyday words. Avoid technical terms; if one is unavoidable (e.g., "Gothic", "baroque", "half-timbered"), explain it right away in simple words or with a comparison from a child's world.
- Use few numbers and names: at most one year or number and one person's name per paragraph. Turn dates into time spans a child can grasp (e.g., "more than 800 years ago, when knights still rode through the town").
- Pick the one or two most vivid things about a place (something very old, big, strange, or funny, or a story from the material) instead of covering many facts. Leave out administrative, legal, economic, and art-historical details.
- Point to concrete things the child can see, hear, or find right here, and include one small question or seek-and-find task per story part about something the material says is there (e.g., "Look up at the tower: can you find the ...?"); such a question is not a request for feedback.
- Keep paragraphs short (three to five sentences).
- Stay enthusiastic and warm, but every fact must be true: never invent details, and call a legend a legend.`,
		commentInstructions:
			'use short, everyday words that a child of about 8 to 12 understands, and make it playful',
		storyLength: {
			MAX_PARAGRAPHS: 3,
			CONTINUATION_MIN_PARAGRAPHS: 1,
			CONTINUATION_MAX_PARAGRAPHS: 2
		}
	},
	{ value: 'romantic and poetic', germanAddress: 'Sie' },
	{ value: 'adventurous and curious', germanAddress: 'du' },
	{ value: 'sarcastic and ironic', germanAddress: 'du' }
];

// German is the only presentation language with a T–V distinction
export const GERMAN_ADDRESS_INSTRUCTIONS = {
	du: 'Address the user informally in the singular with "du" (dich, dir, dein) throughout; never use "Sie" or "ihr"/"euch".',
	Sie: 'Address the user formally with "Sie" (Ihnen, Ihr, Ihre) throughout; never use "du" or "euch".'
};
export const DEFAULT_GERMAN_ADDRESS = 'du';

// storyInstructions and commentInstructions adapt the selection of facts and the
// amount of orientation to the user's knowledge of the area
export const FAMILIARITY = [
	{
		value: 'unfamiliar',
		name: 'unfamiliar (I have never been there)',
		storyInstructions:
			'The user is here for the first time and knows nothing about the area. Orient them: say what kind of place they are in (square, street, quarter, type of neighbourhood) and which prominent place is right around them. Introduce each place before going into details: what it is, what it is used for, and why it matters. Explain local names and terms instead of taking them for granted. Prefer the essentials over obscure details.',
		commentInstructions:
			'The user is new here: help them grasp at a glance what kind of place this is'
	},
	{
		value: 'somewhat_familiar',
		name: "somewhat familiar (I've been there before)",
		storyInstructions:
			'The user has been here before: they know the main landmarks by name and their basic facts, but little more. Keep orientation to half a sentence and do not introduce the main landmarks again; mention them only as reference points. Spend the story on background, connections, and details that a visitor would not have noticed on a first visit.',
		commentInstructions: 'The user has been here before: go beyond the first impression'
	},
	{
		value: 'familiar',
		name: 'familiar (I know the place)',
		storyInstructions:
			'The user knows the area well, for example because they live here. Give no orientation, and neither introduce well-known landmarks nor repeat common knowledge about them (what they are, when they were built, what they are known for); name them as a local would. Instead, tell what even locals may not know, drawn only from the material above: overlooked details, lesser-known places, forgotten history, curious anecdotes, and deeper background. Among the places right here, give a lesser-known one as much room as the famous landmark. If the material holds only well-known facts about a place, keep it short.',
		commentInstructions:
			'The user knows the area well: skip the obvious and surprise them with an angle a local may not have considered'
	}
];

export const AI_MODELS = {
	SIMPLE: [
		{ value: 'gpt-6-luna', name: 'GPT-6 Luna (default, fastest)' },
		{ value: 'gpt-6-sol', name: 'GPT-6 Sol (higher quality)' }
	],
	ADVANCED: [
		{ value: 'gpt-6-luna', name: 'GPT-6 Luna (faster)' },
		{ value: 'gpt-6-sol', name: 'GPT-6 Sol (default)' },
		{ value: 'gpt-6-astra', name: 'GPT-6 Astra (best quality, most expensive)' }
	],
	DEFAULT_SIMPLE: 'gpt-6-luna',
	DEFAULT_ADVANCED: 'gpt-6-sol'
};

export const AI_SPEECH_MODEL = 'gpt-4o-mini-tts';
export const AI_SPEECH_VOICE = 'alloy';
export const AI_SPEECH_SPEED = 1.2;

// Model used by the headless evaluation scripts to judge generated content
export const AI_EVAL_JUDGE_MODEL = 'gpt-6-sol';

// Reasoning effort per task: 'low' for classification and short free-text answers,
// 'medium' where schema-constrained extraction or longer narration benefits from deliberation.
export const AI_REASONING_EFFORT = {
	ANALYSIS: 'low',
	TRANSLATION: 'low',
	SUMMARY: 'low',
	INSIGHTS: 'low',
	COMMENT: 'low',
	FACTS: 'medium',
	HISTORY: 'medium',
	STORY: 'medium',
	WALK_RECAP: 'medium',
	JUDGE: 'medium'
};

export const AI_ANALYSIS_BATCH_SIZE = 10;
export const AI_TRANSLATION_BATCH_SIZE = 25;
