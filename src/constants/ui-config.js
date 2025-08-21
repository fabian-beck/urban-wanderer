export const LANGUAGES = [
	{ value: 'en', name: 'English' },
	{ value: 'de', name: 'German' }
];

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
		{ value: 'gpt-5-nano', name: 'GPT-5 Nano (fastest)' },
		{ value: 'gpt-5-mini', name: 'GPT-5 Mini (default)' },
		{ value: 'gpt-5', name: 'GPT-5 (best quality)' }
	],
	ADVANCED: [
		{ value: 'gpt-5-mini', name: 'GPT-5 Mini (faster)' },
		{ value: 'gpt-5', name: 'GPT-5 (default)' }
	],
	DEFAULT_SIMPLE: 'gpt-5-mini',
	DEFAULT_ADVANCED: 'gpt-5'
};

export const AI_REASONING_EFFORT = 'minimal';
