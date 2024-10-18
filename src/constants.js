export const appName = 'Urban Wanderer';

export const nArticles = 30;

export const CLASSES = {
    'AIRPORT': {
        emoji: '✈️',
        description: 'Airport',
        radius: 1000
    },
    'ABSTRACT_ENTITY': {
        emoji: '?',
        description: 'Abstract entity (e.g., a concept, a non-physical object)',
        nonGeo: true
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
        description: 'Building of any kind (e.g., a house, a skyscraper, a factory)'
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
    'BUSINESS': {
        emoji: '💼',
        description: 'Business (e.g., a shop, a restaurant, a hotel)',
        nonGeo: true
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
    'HOSPITAL': {
        emoji: '🏥',
        description: 'Medical facility (e.g., a hospital, a clinic)'
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
        description: 'Place of worship (e.g., a church, a mosque, a temple)'
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
        radius: 200
    },
    'WATERBODY': {
        emoji: '🌊',
        description: 'Waterbody (e.g., a river, a lake, an ocean)',
        radius: 200
    }
};

export const LABELS = [
    "ARCHITECTURE",
    "CULTURE",
    "ECONOMY",
    "EDUCATION",
    "GEOGRAPHY",
    "HISTORY",
    "RELIGION",
    "SPORT",
    "TRANSPORTATION"
];