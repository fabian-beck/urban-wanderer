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
// places here and surrounding, continuations use a fixed range that the model
// fills depending on how much untold material is left.
export const STORY_LENGTH = {
	MIN_PARAGRAPHS: 2,
	MAX_PARAGRAPHS: 6,
	PLACES_PER_PARAGRAPH: 2,
	CONTINUATION_MIN_PARAGRAPHS: 3,
	CONTINUATION_MAX_PARAGRAPHS: 6
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

export const GUIDE_CHARACTERS = [
	'friendly and helpful',
	'funny and witty',
	'serious and professional',
	'kid-friendly (enthusiastic and using simple terms)',
	'romantic and poetic',
	'adventurous and curious',
	'sarcastic and ironic'
];

export const FAMILIARITY = [
	{ value: 'unfamiliar', name: 'unfamiliar (I have never been there)' },
	{ value: 'somewhat_familiar', name: "somewhat familiar (I've been there before)" },
	{ value: 'familiar', name: 'familiar (I know the place)' }
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
	WALK_RECAP: 'medium'
};

export const AI_ANALYSIS_BATCH_SIZE = 10;
export const AI_TRANSLATION_BATCH_SIZE = 25;
