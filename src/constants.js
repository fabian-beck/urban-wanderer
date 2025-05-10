export const appName = 'Urban Wanderer';

export const nArticles = 40;

export const CLASSES = {
    'ABSTRACT_ENTITY': {
        emoji: '?',
        description: 'Abstract entity (e.g., a concept, a non-physical object)',
        nonGeo: true
    },
    'AIRPORT': {
        emoji: '✈️',
        description: 'Airport',
        radius: 1000
    },
    'AMBIGUOUS_PLACE': {
        emoji: '?',
        description: 'Not really a place, but a reference to mulitple places or a vague location (e.g., a public tranport network)',
        nonGeo: true
    },
    'ARTWORK': {
        emoji: '🖼️',
        description: 'Artwork (e.g., a painting, a relief, but not a statue)',
    },
    'ARCHAEOLOGICAL_SITE': {
        emoji: '⛏️',
        description: 'Archaeological site'
    },
    'BRIDGE': {
        emoji: '🌉',
        description: 'Bridge',
        radius: 150
    },
    'BUILDING': {
        emoji: '🏢',
        description: 'Building of any kind (e.g., a house, a skyscraper, a factory) or a part of a building (e.g., a portal, a room)',
    },
    'BUSINESS_REGULAR': {
        emoji: '💼',
        description: 'Regular business (e.g., a shop, a restaurant, a hotel)',
        nonGeo: true
    },
    'BUSINESS_UNIQUE': {
        emoji: '💼',
        description: 'Unique business (e.g., a famous restaurant, a unique hotel, a business of historical importance)',
    },
    'CASTLE': {
        emoji: '🏰',
        description: 'Castle or fortress',
        radius: 200
    },
    'CEMETERY': {
        emoji: '⚰️',
        description: 'Cemetery or tomb',
        radius: 200
    },
    'CITY/DISTRICT': {
        emoji: '🏙️',
        description: 'City, village, or district',
        isSurrounding: true
    },
    'EVENT': {
        emoji: '🎉',
        description: 'Event that happend at this place',
        nonGeo: true
    },
    'INSTITUTION': {
        emoji: '🏛️',
        description: 'Institution (e.g., a school, a hospital, a government building)'
    },
    'LANDMARK': {
        emoji: '📍 ',
        description: 'Landmark'
    },
    'HARBOUR': {
        emoji: '⚓',
        description: 'Harbour',
        radius: 300
    },
    'HOSPITAL': {
        emoji: '🏥',
        description: 'Medical facility (e.g., a hospital, a clinic)',
        radius: 200
    },
    'MEMORIAL': {
        emoji: '🕯️',
        description: 'Memorial (e.g., a memorial stone)'
    },
    'MONUMENT': {
        emoji: '🗿',
        description: 'Monument'
    },
    'MOUNTAIN': {
        emoji: '⛰️',
        description: 'Mountain',
        radius: 500
    },
    'MUSEUM': {
        emoji: '🖼️',
        description: 'Museum'
    },
    'OBSERVATORY': {
        emoji: '🔭',
        description: 'Observatory'
    },
    'PARK': {
        emoji: '🌳',
        description: 'Park',
        radius: 300
    },
    'PERSON': {
        emoji: '👤',
        description: 'Person',
        nonGeo: true
    },
    'PLACE_OF_WORSHIP': {
        emoji: '🛐',
        description: 'Place of worship (e.g., a church, a mosque, a temple)',
        radius: 150
    },
    'SPORTS_FACILITY': {
        emoji: '🏟️',
        description: 'Sports facility (e.g., a stadium, a gym)',
        radius: 200
    },
    'STATE/COUNTRY': {
        emoji: '🌍',
        description: 'State or country',
        isSurrounding: true
    },
    'STATUE': {
        emoji: '🗽',
        description: 'Statue'
    },
    'STATION': {
        emoji: '🚉',
        description: 'Station (e.g., a train station, a bus station)',
        radius: 200
    },
    'STREET/SQUARE': {
        emoji: '🛣️',
        description: 'Street or square',
        radius: 150
    },
    'UNIVERSITY/SCHOOL': {
        emoji: '🎓',
        description: 'University, college, or school',
        radius: 150
    },
    'WATERBODY': {
        emoji: '🌊',
        description: 'Waterbody (e.g., a river, a lake, an ocean)',
        radius: 200
    }
};

export const LANGUAGES = [
    { value: 'en', name: 'English' },
    { value: 'de', name: 'German' }
];

export const LABELS = [
    "ARCHITECTURE",
    "CULTURE",
    "GEOGRAPHY",
    "HISTORY",
    "RELIGION",
    "SPORTS",
    "TRANSPORTATION"
];

export const GUIDE_CHARACTERS = [
    "friendly and helpful",
    "funny and witty",
    "serious and professional",
    "kid-friendly (simple language) and pedagogical",
    "romantic and poetic",
    "adventurous and curious",
    "sarcastic and ironic"
]

export const FAMILIARITY = [
    { value: 'unfamiliar', name: 'unfamiliar (I have never been there)' },
    { value: 'somewhat_familiar', name: "somewhat familiar (I've been there before)" },
    { value: 'familiar', name: 'familiar (I know the place)' },
];