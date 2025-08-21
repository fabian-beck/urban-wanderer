export const appName = 'Urban Wanderer';

export const nArticles = 40;

// Wikipedia article processing
export const MAX_ARTICLE_LENGTH = 30000;

// Grid constants
export const GRID_CELL_SIZE = 20; // Grid cell size in both pixels and meters
export const GRID_ARRAY_SIZE = 40; // Grid array dimensions

// Stipple size factors (0-1, where 1.0 fills the grid cell)
export const GREEN_STIPPLE_SIZE = 0.8;
export const WATER_STIPPLE_SIZE = 1.0;
export const ACTIVITY_STIPPLE_SIZE = 0.6;

// Place highlighting constants
export const PLACE_MIN_DISTANCE = 70;

// OSM search radius for Overpass API queries
export const OSM_SEARCH_RADIUS = 500;

export const CLASSES = {
	ABSTRACT_ENTITY: {
		emoji: '?',
		description: 'Abstract entity (e.g., a concept, a non-physical object)',
		nonGeo: true
	},
	AIRPORT: {
		emoji: '✈️',
		description: 'Airport',
		radius: 1000,
		properties: ['constructed', 'area', 'yearly_passenger_count']
	},
	AMBIGUOUS_PLACE: {
		emoji: '?',
		description:
			'Not really a place, but a reference to mulitple places or a vague location (e.g., a public tranport network)',
		nonGeo: true
	},
	ARTWORK: {
		emoji: '🖼️',
		description: 'Artwork (e.g., a painting, a relief, but not a statue)',
		properties: ['created', 'artist']
	},
	ARCHAEOLOGICAL_SITE: {
		emoji: '⛏️',
		description: 'Archaeological site',
		properties: ['discovered', 'area']
	},
	BRIDGE: {
		emoji: '🌉',
		description: 'Bridge',
		radius: 150,
		properties: ['constructed', 'length', 'bridge_type', 'clearance_height']
	},
	BUILDING: {
		emoji: '🏢',
		description:
			'Building of any kind (e.g., a house, a skyscraper, a factory) or a part of a building (e.g., a portal, a room)',
		properties: ['constructed', 'height', 'building_type', 'architecture_style']
	},
	BUSINESS_REGULAR: {
		emoji: '💼',
		description: 'Regular business (e.g., a shop, a restaurant, a hotel)',
		nonGeo: true
	},
	BUSINESS_UNIQUE: {
		emoji: '💼',
		description:
			'Unique business (e.g., a famous restaurant, a unique hotel, a business of historical importance)',
		properties: ['established', 'employee_count', 'yearly_revenue', 'business_type']
	},
	CASTLE: {
		emoji: '🏰',
		description: 'Castle or fortress',
		radius: 200,
		properties: ['constructed', 'area', 'architecture_style']
	},
	CEMETERY: {
		emoji: '⚰️',
		description: 'Cemetery or tomb',
		radius: 200,
		properties: ['area', 'established']
	},
	'CITY/DISTRICT': {
		emoji: '🏙️',
		description: 'City, village, or district',
		isSurrounding: true,
		properties: ['area', 'established', 'population']
	},
	EVENT: {
		emoji: '🎉',
		description: 'Event that happend at this place',
		nonGeo: true
	},
	INSTITUTION: {
		emoji: '🏛️',
		description: 'Institution (e.g., a school, a hospital, a government building)',
		properties: ['established', 'employee_count']
	},
	LANDMARK: {
		emoji: '📍 ',
		description: 'Landmark'
	},
	HARBOUR: {
		emoji: '⚓',
		description: 'Harbour',
		radius: 300,
		properties: ['constructed', 'area', 'yearly_tonnage', 'good_types']
	},
	HOSPITAL: {
		emoji: '🏥',
		description: 'Medical facility (e.g., a hospital, a clinic)',
		radius: 200,
		properties: ['established', 'employee_count', 'bed_count']
	},
	MEMORIAL: {
		emoji: '🕯️',
		description: 'Memorial (e.g., a memorial stone)',
		properties: ['established']
	},
	MONUMENT: {
		emoji: '🗿',
		description: 'Monument',
		properties: ['established']
	},
	MOUNTAIN: {
		emoji: '⛰️',
		description: 'Mountain',
		radius: 500,
		properties: ['height']
	},
	MUSEUM: {
		emoji: '🖼️',
		description: 'Museum',
		properties: ['established', 'visit_count']
	},
	OBSERVATORY: {
		emoji: '🔭',
		description: 'Observatory',
		properties: ['established']
	},
	PARK: {
		emoji: '🌳',
		description: 'Park',
		radius: 300,
		properties: ['area', 'established', 'facilities']
	},
	PERSON: {
		emoji: '👤',
		description: 'Person',
		nonGeo: true
	},
	PLACE_OF_WORSHIP: {
		emoji: '🛐',
		description: 'Place of worship (e.g., a church, a mosque, a temple)',
		radius: 150,
		properties: ['established', 'height', 'architecture_style']
	},
	SPORTS_FACILITY: {
		emoji: '🏟️',
		description: 'Sports facility (e.g., a stadium, a gym)',
		radius: 200,
		properties: ['established', 'capacity']
	},
	'STATE/COUNTRY': {
		emoji: '🌍',
		description: 'State or country',
		isSurrounding: true,
		properties: ['area', 'population']
	},
	STATUE: {
		emoji: '🗽',
		description: 'Statue',
		properties: ['established', 'height']
	},
	STATION: {
		emoji: '🚉',
		description: 'Station (e.g., a train station, a bus station)',
		radius: 200,
		properties: ['constructed', 'area', 'yearly_passenger_count', 'main_destinations']
	},
	'STREET/SQUARE': {
		emoji: '🛣️',
		description: 'Street or square',
		radius: 150,
		properties: ['length']
	},
	'UNIVERSITY/SCHOOL': {
		emoji: '🎓',
		description: 'University, college, or school',
		radius: 150,
		properties: ['established', 'student_count', 'employee_count']
	},
	WATERBODY: {
		emoji: '🌊',
		description: 'Waterbody (e.g., a river, a lake, an ocean)',
		radius: 200
	}
};

export const PROPERTIES = {
	area: {
		type: 'string',
		description: 'area of the place (e.g., 1000 m², 1.5 km²), if available'
	},
	architecture_style: {
		type: 'string',
		description: 'architectural style of the place (e.g., Gothic, Baroque), if available'
	},
	artist: {
		type: 'string',
		description: 'artist of the artwork, if available'
	},
	bed_count: {
		type: 'number',
		description: 'number of beds in the hospital, if available'
	},
	bridge_type: {
		type: 'string',
		description:
			'type of bridge - one of the following: ARCH, BEAM, CANTILEVER, SUSPENSION, STAYED, TIE, OTHER'
	},
	building_type: {
		type: 'string',
		description:
			'type of building (e.g., residential, commercial, industrial, church, tower), if available'
	},
	business_type: {
		type: 'string',
		description: 'type of business (e.g., Restaurant, Hotel, Shop), if available'
	},
	capacity: {
		type: 'number',
		description: 'capacity of the facility (e.g., number of seats), if available'
	},
	clearance_height: {
		type: 'string',
		description: 'clearance height under the bridge (e.g., 4.5 m), if available'
	},
	constructed: {
		type: 'number',
		description: 'year of construction (e.g., 1990), if available'
	},
	created: {
		type: 'number',
		description: 'year of creation for artworks, if available'
	},
	discovered: {
		type: 'number',
		description: 'year of discovery for archaeological sites, if available'
	},
	established: {
		type: 'number',
		description: 'year of establishment (e.g., 1990), if available'
	},
	employee_count: {
		type: 'number',
		description: 'number of employees (e.g., 100), if available'
	},
	facilities: {
		type: 'array',
		items: {
			type: 'string',
			description: 'list of facilities as emoji icons (e.g., toilets = 🚻, waterbody = 🌊)'
		}
	},
	good_types: {
		type: 'array',
		items: {
			type: 'string',
			description:
				'list of good types as emoji icons (e.g., grain = 🌾, coal = 🪨, oil = 🛢️, containers = 📦, cars = 🚗)'
		}
	},
	height: {
		type: 'string',
		description: 'height of the place (e.g., 100 m), if available'
	},
	length: {
		type: 'string',
		description: 'length of the place (e.g., 1000 m), if available'
	},
	main_destinations: {
		type: 'array',
		items: {
			type: 'string',
			description: 'list of main destinations from a station'
		}
	},
	population: {
		type: 'number',
		description: 'population of the place (e.g. 100000), if available'
	},
	student_count: {
		type: 'number',
		description: 'number of students, if available'
	},
	visit_count: {
		type: 'number',
		description: 'annual number of visitors for a museum, if available'
	},
	yearly_passenger_count: {
		type: 'number',
		description: 'number of yearly passengers (e.g., for an airport or station), if available'
	},
	yearly_revenue: {
		type: 'string',
		description: 'yearly revenue of the business (e.g., 1.5M EUR, 100k USD), if available'
	},
	yearly_tonnage: {
		type: 'string',
		description: 'yearly tonnage of the place (e.g., 1000 t), if available'
	}
};

export const PROPERTY_TRANSLATIONS = {
	area: {
		en: 'Area',
		de: 'Fläche'
	},
	architecture_style: {
		en: 'Architecture Style',
		de: 'Architekturstil'
	},
	artist: {
		en: 'Artist',
		de: 'Künstler'
	},
	bed_count: {
		en: 'Bed Count',
		de: 'Bettenanzahl'
	},
	bridge_type: {
		en: 'Bridge type',
		de: 'Brückentyp'
	},
	building_type: {
		en: 'Building type',
		de: 'Gebäudetyp'
	},
	business_type: {
		en: 'Business type',
		de: 'Geschäftsart'
	},
	capacity: {
		en: 'Capacity',
		de: 'Kapazität'
	},
	clearance_height: {
		en: 'Clearance height',
		de: 'Durchfahrtshöhe'
	},
	constructed: {
		en: 'Constructed',
		de: 'Baujahr'
	},
	created: {
		en: 'Created',
		de: 'Erstellt'
	},
	discovered: {
		en: 'Discovered',
		de: 'Entdeckt'
	},
	established: {
		en: 'Established',
		de: 'Gründung'
	},
	employee_count: {
		en: 'Employees',
		de: 'Mitarbeiter'
	},
	facilities: {
		en: 'Facilities',
		de: 'Ausstattung'
	},
	good_types: {
		en: 'Goods',
		de: 'Güter'
	},
	height: {
		en: 'Height',
		de: 'Höhe'
	},
	length: {
		en: 'Length',
		de: 'Länge'
	},
	main_destinations: {
		en: 'Main Destinations',
		de: 'Hauptziele'
	},
	population: {
		en: 'Population',
		de: 'Einwohner'
	},
	student_count: {
		en: 'Student Count',
		de: 'Studentenanzahl'
	},
	visit_count: {
		en: 'Visitor Count',
		de: 'Besucheranzahl'
	},
	yearly_passenger_count: {
		en: 'Yearly Passengers',
		de: 'Jährliche Passagiere'
	},
	yearly_revenue: {
		en: 'Yearly revenue',
		de: 'Jahresumsatz'
	},
	yearly_tonnage: {
		en: 'Yearly tonnage',
		de: 'Jahresumschlag'
	}
};

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

// Standard reasoning configuration for all AI requests
export const AI_REASONING_EFFORT = 'minimal';

// Famous buildings for height comparison (sorted by height in meters)
export const FAMOUS_BUILDINGS = [
	// Small / Historic (<100m)
	{ name: 'Parthenon', shortName: 'Parthenon (GR)', height: 14, image: 'parthenon.png' },
	{
		name: 'Brandenburg Gate',
		shortName: 'Brandenburg (DE)',
		height: 26,
		image: 'brandenburg_gate.png'
	},
	{
		name: 'Arc de Triomphe',
		shortName: 'Arc Triomphe (FR)',
		height: 50,
		image: 'arc_de_triomphe.png'
	},
	{
		name: 'Leaning Tower of Pisa',
		shortName: 'Pisa Tower (IT)',
		height: 56,
		image: 'leaning_tower_of_pisa.png'
	},
	{
		name: 'Notre-Dame de Paris',
		shortName: 'Notre-Dame (FR)',
		height: 69,
		image: 'notre_dame_de_paris.png'
	},
	{
		name: 'Statue of Liberty',
		shortName: 'Statue Liberty (US)',
		height: 93,
		image: 'statue_of_liberty.png'
	}, // statue 46m, with pedestal 93m
	{ name: 'Big Ben', shortName: 'Big Ben (UK)', height: 96, image: 'big_ben.png' },

	// Medium (100–200m)
	{
		name: 'Florence Cathedral',
		shortName: 'Florence Cath. (IT)',
		height: 114,
		image: 'florence_cathedral.png'
	},
	{
		name: 'Cologne Cathedral',
		shortName: 'Cologne Cath. (DE)',
		height: 157,
		image: 'cologne_cathedral.png'
	},
	{
		name: 'Washington Monument',
		shortName: 'Washington Mem. (US)',
		height: 169,
		image: 'washington_monument.png'
	},
	{ name: 'Space Needle', shortName: 'Space Needle (US)', height: 184, image: 'space_needle.png' },

	// Tall (200–300m)
	{
		name: 'Marina Bay Sands',
		shortName: 'Marina Bay (SG)',
		height: 200,
		image: 'marina_bay_sands.png'
	},
	{
		name: 'Messeturm Frankfurt',
		shortName: 'Messeturm (DE)',
		height: 257,
		image: 'messeturm_frankfurt.png'
	},

	// Super-Tall (300m+)
	{ name: 'Eiffel Tower', shortName: 'Eiffel Tower (FR)', height: 330, image: 'eiffel_tower.png' },
	{
		name: 'Empire State Building',
		shortName: 'Empire State (US)',
		height: 443,
		image: 'empire_state_building.png'
	}, // 381m roof, 443m tip
	{ name: 'Taipei 101', shortName: 'Taipei 101 (TW)', height: 508, image: 'taipei_101.png' }, // 508m roof, 508m tip
	{ name: 'Burj Khalifa', shortName: 'Burj Khalifa (AE)', height: 828, image: 'burj_khalifa.png' }
];

// Architectural styles with background patterns
export const ARCHITECTURE_STYLES = {
	classical: {
		name: 'Classical',
		image: 'classical.png',
		description: 'Inspired by ancient Greek and Roman architecture'
	},
	gothic: {
		name: 'Gothic',
		image: 'gothic.png',
		description: 'Pointed arches, ribbed vaults, flying buttresses'
	},
	romanesque: {
		name: 'Romanesque',
		image: 'romanesque.png',
		description: 'Round arches, thick walls, sturdy construction'
	},
	renaissance: {
		name: 'Renaissance',
		image: 'renaissance.png',
		description: 'Classical proportions, symmetry, columns'
	},
	baroque: {
		name: 'Baroque',
		image: 'baroque.png',
		description: 'Ornate decoration, dramatic lighting, curves'
	},
	'art nouveau': {
		name: 'Art Nouveau',
		image: 'art_nouveau.png',
		description: 'Organic forms, flowing lines, natural motifs'
	},
	'art deco': {
		name: 'Art Deco',
		image: 'art_deco.png',
		description: 'Geometric patterns, bold lines, luxury materials'
	},
	modernist: {
		name: 'Modernist',
		image: 'modernist.png',
		description: 'Form follows function, glass and steel, no ornamentation'
	},
	bauhaus: {
		name: 'Bauhaus',
		image: 'bauhaus.png',
		description: 'Form follows function, industrial materials'
	},
	postmodern: {
		name: 'Postmodern',
		image: 'postmodern.png',
		description: 'Anti-modernist, decorative, ironic historical mixing'
	},
	contemporary: {
		name: 'Contemporary',
		image: 'contemporary.png',
		description: 'Current trends, innovative materials, sustainability'
	},
	brutalist: {
		name: 'Brutalist',
		image: 'brutalist.png',
		description: 'Raw concrete, bold geometric forms, monolithic'
	},
	deconstructivist: {
		name: 'Deconstructivist',
		image: 'deconstructivist.png',
		description: 'Fragmented geometry, non-rectilinear shapes'
	},
	byzantine: {
		name: 'Byzantine',
		image: 'byzantine.png',
		description: 'Domes, mosaics, religious symbolism'
	},
	victorian: {
		name: 'Victorian',
		image: 'victorian.png',
		description: 'Ornate details, bay windows, asymmetrical facades'
	},
	'beaux-arts': {
		name: 'Beaux-Arts',
		image: 'beaux_arts.png',
		description: 'Academic classicism, grand scale, ornate decoration'
	},

	// Neo variants - reuse base style images
	neoclassical: {
		name: 'Neoclassical',
		image: 'classical.png',
		description: 'Classical Greek and Roman revival'
	},
	neogothic: {
		name: 'Neo-Gothic',
		image: 'gothic.png',
		description: 'Gothic revival with modern interpretations'
	},
	neoromanesque: {
		name: 'Neo-Romanesque',
		image: 'romanesque.png',
		description: 'Romanesque revival in modern times'
	},
	neorenaissance: {
		name: 'Neo-Renaissance',
		image: 'renaissance.png',
		description: 'Renaissance revival architecture'
	},
	neobaroque: {
		name: 'Neo-Baroque',
		image: 'baroque.png',
		description: 'Baroque revival with contemporary elements'
	},
	neobyzantine: {
		name: 'Neo-Byzantine',
		image: 'byzantine.png',
		description: 'Byzantine revival architecture'
	},
	neovictorian: {
		name: 'Neo-Victorian',
		image: 'victorian.png',
		description: 'Victorian revival style'
	}
};

// Historical events reference for construction year context
export const HISTORICAL_EVENTS = [
	// Ancient & Medieval
	{ start: -753, name: 'founding of Rome' },
	{ start: -44, name: 'assassination of Julius Caesar' },
	{ start: 476, name: 'fall of the Western Roman Empire' },
	{ start: 800, name: 'coronation of Charlemagne' },
	{ start: 1066, name: 'Norman Conquest of England' },
	{ start: 1096, name: 'start of the First Crusade' },
	{ start: 1453, name: 'fall of Constantinople' },

	// Renaissance & Early Modern
	{ start: 1440, name: 'invention of the printing press' },
	{ start: 1492, name: 'Columbus reaches the Americas' },
	{ start: 1517, name: 'start of the Protestant Reformation' },
	{ start: 1543, name: 'Copernicus publishes heliocentric theory' },
	{ start: 1588, name: 'defeat of the Spanish Armada' },
	{ start: 1609, name: 'Galileo\'s first telescope observations' },
	{ start: 1666, name: 'Great Fire of London' },
	{ start: 1776, name: 'American Declaration of Independence' },
	{ start: 1789, end: 1799, name: 'the French Revolution' },

	// Industrial Revolution & 19th Century
	{ start: 1804, name: 'Napoleon\'s coronation as Emperor' },
	{ start: 1807, name: 'Fulton\'s first steamboat' },
	{ start: 1815, name: 'Battle of Waterloo' },
	{ start: 1825, name: 'first passenger railway opened' },
	{ start: 1837, name: 'invention of the telegraph' },
	{ start: 1848, name: 'revolutions across Europe' },
	{ start: 1859, name: 'Darwin publishes Origin of Species' },
	{ start: 1861, end: 1865, name: 'American Civil War' },
	{ start: 1869, name: 'opening of the Suez Canal' },
	{ start: 1876, name: 'invention of the telephone' },
	{ start: 1879, name: 'Edison\'s first light bulb' },
	{ start: 1885, name: 'first automobile' },
	{ start: 1886, name: 'Statue of Liberty dedication' },
	{ start: 1888, name: 'Kodak camera invented' },

	// Early 20th Century
	{ start: 1901, name: 'first transatlantic radio signal' },
	{ start: 1903, name: 'first powered flight' },
	{ start: 1905, name: 'Einstein\'s theory of relativity' },
	{ start: 1914, end: 1918, name: 'World War I' },
	{ start: 1917, name: 'Russian Revolution' },
	{ start: 1929, name: 'Wall Street Crash' },
	{ start: 1933, name: 'Hitler rises to power' },
	{ start: 1939, end: 1945, name: 'World War II' },

	// Mid-Late 20th Century
	{ start: 1945, name: 'founding of the United Nations' },
	{ start: 1947, name: 'India\'s independence' },
	{ start: 1957, name: 'launch of Sputnik' },
	{ start: 1961, name: 'construction of Berlin Wall' },
	{ start: 1963, name: 'assassination of JFK' },
	{ start: 1969, name: 'moon landing' },
	{ start: 1973, name: 'oil crisis' },
	{ start: 1981, name: 'launch of IBM PC' },
	{ start: 1989, name: 'fall of Berlin Wall' },
	{ start: 1991, name: 'collapse of Soviet Union' },

	// Recent History
	{ start: 2001, name: 'September 11 attacks' },
	{ start: 2008, name: 'global financial crisis' },
	{ start: 2020, name: 'COVID-19 pandemic' }
];
