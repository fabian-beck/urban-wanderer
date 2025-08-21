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
		properties: ['constructed', 'length', 'bridge_type', 'clearance_height', 'material']
	},
	BUILDING: {
		emoji: '🏢',
		description:
			'Building of any kind (e.g., a house, a skyscraper, a factory) or a part of a building (e.g., a portal, a room)',
		properties: ['constructed', 'height', 'building_type', 'architecture_style', 'material']
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
		properties: ['constructed', 'area', 'architecture_style', 'material']
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
		description: 'Institution (e.g., a school, a government building)',
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
	HOTEL: {
		emoji: '🏨',
		description: 'Hotel',
		radius: 200,
		properties: ['established', 'employee_count', 'room_count', 'material', 'architecture_style', 'height']
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
		description:
			'height of the place (e.g., "100m"), if available; number and unit (meters preferred), no extra explanations'
	},
	length: {
		type: 'string',
		description:
			'length of the place (e.g., "1000m"), if available; number and unit (meters preferred), no extra explanations'
	},
	main_destinations: {
		type: 'array',
		items: {
			type: 'string',
			description: 'list of main destinations from a station'
		}
	},
	material: {
		type: 'string',
		description: 'primary material used (e.g., wood, steel, concrete), if available; use emojis'
	},
	population: {
		type: 'number',
		description: 'population of the place (e.g. 100000), if available'
	},
	room_count: {
		type: 'number',
		description: 'number of rooms, if available'
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
	material: {
		en: 'Material',
		de: 'Material'
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
		name: { en: 'Classical', de: 'Klassisch' },
		image: 'classical.png',
		description: {
			en: 'Inspired by ancient Greek and Roman architecture',
			de: 'Inspiriert von der antiken griechischen und römischen Architektur'
		}
	},
	gothic: {
		name: { en: 'Gothic', de: 'Gotisch' },
		image: 'gothic.png',
		description: {
			en: 'Pointed arches, ribbed vaults, flying buttresses, verticality',
			de: 'Spitzbogen, Rippengewölbe, Strebebögen, Vertikalität'
		}
	},
	romanesque: {
		name: { en: 'Romanesque', de: 'Romanisch' },
		image: 'romanesque.png',
		description: {
			en: 'Round arches, thick walls, sturdy construction',
			de: 'Rundbogen, dicke Mauern, robuste Bauweise'
		}
	},
	renaissance: {
		name: { en: 'Renaissance', de: 'Renaissance' },
		image: 'renaissance.png',
		description: {
			en: 'Classical proportions, symmetry, columns',
			de: 'Klassische Proportionen, Symmetrie, Säulen'
		}
	},
	baroque: {
		name: { en: 'Baroque', de: 'Barock' },
		image: 'baroque.png',
		description: {
			en: 'Ornate decoration, dramatic lighting, curves',
			de: 'Prunkvolle Dekoration, dramatische Beleuchtung, geschwungene Formen'
		}
	},
	'art nouveau': {
		name: { en: 'Art Nouveau', de: 'Jugendstil' },
		image: 'art_nouveau.png',
		description: {
			en: 'Organic forms, flowing lines, natural motifs',
			de: 'Organische Formen, fließende Linien, Naturmotive'
		}
	},
	'art deco': {
		name: { en: 'Art Deco', de: 'Art Déco' },
		image: 'art_deco.png',
		description: {
			en: 'Geometric patterns, bold lines, luxury materials',
			de: 'Geometrische Muster, kühne Linien, Luxusmaterialien'
		}
	},
	modernist: {
		name: { en: 'Modernist', de: 'Modernistisch' },
		image: 'modernist.png',
		description: {
			en: 'Form follows function, glass and steel, minimal ornamentation',
			de: 'Form folgt Funktion, Glas und Stahl, minimale Verzierung'
		}
	},
	bauhaus: {
		name: { en: 'Bauhaus', de: 'Bauhaus' },
		image: 'bauhaus.png',
		description: {
			en: 'Form follows function, industrial materials',
			de: 'Form folgt Funktion, industrielle Materialien'
		}
	},
	postmodern: {
		name: { en: 'Postmodern', de: 'Postmodern' },
		image: 'postmodern.png',
		description: {
			en: 'Reaction to modernism, decorative, ironic historical mixing',
			de: 'Gegenbewegung zur Moderne, dekorativ, ironische historische Vermischung'
		}
	},
	contemporary: {
		name: { en: 'Contemporary', de: 'Zeitgenössisch' },
		image: 'contemporary.png',
		description: {
			en: 'Current trends, innovative materials, sustainability',
			de: 'Aktuelle Trends, innovative Materialien, Nachhaltigkeit'
		}
	},
	brutalist: {
		name: { en: 'Brutalist', de: 'Brutalistisch' },
		image: 'brutalist.png',
		description: {
			en: 'Raw concrete, bold geometric forms, monolithic',
			de: 'Rohbeton, kühne geometrische Formen, monolithisch'
		}
	},
	deconstructivist: {
		name: { en: 'Deconstructivist', de: 'Dekonstruktivistisch' },
		image: 'deconstructivist.png',
		description: {
			en: 'Fragmented geometry, non-rectilinear shapes',
			de: 'Fragmentierte Geometrie, nicht-rechtwinklige Formen'
		}
	},
	byzantine: {
		name: { en: 'Byzantine', de: 'Byzantinisch' },
		image: 'byzantine.png',
		description: {
			en: 'Domes, mosaics, religious symbolism',
			de: 'Kuppeln, Mosaike, religiöse Symbolik'
		}
	},
	victorian: {
		name: { en: 'Victorian', de: 'Viktorianisch' },
		image: 'victorian.png',
		description: {
			en: 'Ornate details, bay windows, asymmetrical facades',
			de: 'Verzierte Details, Erker, asymmetrische Fassaden'
		}
	},
	'beaux-arts': {
		name: { en: 'Beaux-Arts', de: 'Beaux-Arts' },
		image: 'beaux_arts.png',
		description: {
			en: 'Academic classicism, grand scale, ornate decoration',
			de: 'Akademischer Klassizismus, groß angelegt, prunkvolle Dekoration'
		}
	},

	// Neo variants - reuse base style images
	neoclassical: {
		name: { en: 'Neoclassical', de: 'Neoklassisch' },
		image: 'classical.png',
		description: {
			en: 'Classical revival style',
			de: 'Wiederbelebungsstil der griechischen und römischen Klassik'
		}
	},
	neogothic: {
		name: { en: 'Neo-Gothic', de: 'Neogotisch' },
		image: 'gothic.png',
		description: {
			en: 'Gothic revival style with modern interpretations',
			de: 'Gotik-Wiederbelebungsstil mit modernen Interpretationen'
		}
	},
	neoromanesque: {
		name: { en: 'Neo-Romanesque', de: 'Neoromanisch' },
		image: 'romanesque.png',
		description: { en: 'Romanesque revival style', de: 'Romanik-Wiederbelebungsstil' }
	},
	neorenaissance: {
		name: { en: 'Neo-Renaissance', de: 'Neorenaissance' },
		image: 'renaissance.png',
		description: { en: 'Renaissance revival style', de: 'Renaissance-Wiederbelebungsstil' }
	},
	neobaroque: {
		name: { en: 'Neo-Baroque', de: 'Neobarock' },
		image: 'baroque.png',
		description: {
			en: 'Baroque revival style with contemporary elements',
			de: 'Barock-Wiederbelebungsstil mit zeitgenössischen Elementen'
		}
	},
	neobyzantine: {
		name: { en: 'Neo-Byzantine', de: 'Neobyzantinisch' },
		image: 'byzantine.png',
		description: { en: 'Byzantine revival style', de: 'Byzantinischer Wiederbelebungsstil' }
	},
	neovictorian: {
		name: { en: 'Neo-Victorian', de: 'Neoviktorianisch' },
		image: 'victorian.png',
		description: { en: 'Victorian revival style', de: 'Viktorianischer Wiederbelebungsstil' }
	}
};

// Historical events reference for construction year context
export const HISTORICAL_EVENTS = [
	// Ancient & Medieval
	{ start: -753, name: { en: '🏛️ founding of Rome', de: '🏛️ Gründung Roms' } },
	{ start: -44, name: { en: '⚔️ assassination of Caesar', de: '⚔️ Ermordung Caesars' } },
	{
		start: 476,
		name: { en: '🏛️ fall of Western Roman Empire', de: '🏛️ Untergang des Weströmischen Reichs' }
	},
	{ start: 800, name: { en: '👑 Charlemagne coronation', de: '👑 Krönung Karls des Großen' } },
	{ start: 1066, name: { en: '⚔️ Norman Conquest', de: '⚔️ Normannische Eroberung' } },
	{ start: 1096, name: { en: '⛪ First Crusade', de: '⛪ Erster Kreuzzug' } },
	{ start: 1347, end: 1351, name: { en: '☠️ the Black Death', de: '☠️ der Schwarze Tod' } },
	{ start: 1453, name: { en: '🏰 fall of Constantinople', de: '🏰 Fall Konstantinopels' } },

	// Renaissance & Early Modern
	{ start: 1492, name: { en: '🌍 Columbus reaches Americas', de: '🌍 Kolumbus erreicht Amerika' } },
	{ start: 1517, name: { en: '⛪ Protestant Reformation', de: '⛪ Reformation' } },
	{ start: 1666, name: { en: '🔥 Great Fire of London', de: '🔥 Großer Brand von London' } },
	{ start: 1776, name: { en: '🇺🇸 US Independence', de: '🇺🇸 US-Unabhängigkeit' } },
	{
		start: 1789,
		end: 1799,
		name: { en: '🇫🇷 French Revolution', de: '🇫🇷 Französische Revolution' }
	},

	// Industrial Revolution & 19th Century
	{ start: 1815, name: { en: '⚔️ Battle of Waterloo', de: '⚔️ Schlacht bei Waterloo' } },
	{ start: 1837, name: { en: '📡 telegraph invention', de: '📡 Erfindung des Telegrafen' } },
	{
		start: 1859,
		name: { en: '🐒 Darwin Origin of Species', de: '🐒 Darwins „Über die Entstehung der Arten“' }
	},
	{ start: 1861, end: 1865, name: { en: '🇺🇸 Civil War', de: '🇺🇸 Amerikanischer Bürgerkrieg' } },
	{ start: 1876, name: { en: '☎️ telephone invention', de: '☎️ Erfindung des Telefons' } },
	{ start: 1886, name: { en: '🗽 Statue of Liberty', de: '🗽 Freiheitsstatue' } },

	// Early 20th Century
	{ start: 1903, name: { en: '✈️ first powered flight', de: '✈️ erster Motorflug' } },
	{ start: 1914, end: 1918, name: { en: '⚔️ World War I', de: '⚔️ Erster Weltkrieg' } },
	{ start: 1917, name: { en: '🚩 Russian Revolution', de: '🚩 Russische Revolution' } },
	{ start: 1929, name: { en: '📉 Wall Street Crash', de: '📉 Börsencrash' } },
	{ start: 1939, end: 1945, name: { en: '💥 World War II', de: '💥 Zweiter Weltkrieg' } },

	// Mid-Late 20th Century
	{ start: 1957, name: { en: '🚀 Sputnik launch', de: '🚀 Sputnik-Start' } },
	{ start: 1961, name: { en: '🧱 Berlin Wall constructed', de: '🧱 Bau der Berliner Mauer' } },
	{ start: 1963, name: { en: '🔫 JFK assassination', de: '🔫 Ermordung Kennedys' } },
	{ start: 1969, name: { en: '🌙 moon landing', de: '🌙 Mondlandung' } },
	{ start: 1989, name: { en: '🧱 Berlin Wall falls', de: '🧱 Mauerfall' } },
	{ start: 1991, name: { en: '🚩 Soviet Union collapse', de: '🚩 Zerfall der Sowjetunion' } },

	// Recent History
	{
		start: 2001,
		name: { en: '🏢 September 11 attacks', de: '🏢 Terroranschläge am 11. September' }
	},
	{ start: 2008, name: { en: '📉 financial crisis', de: '📉 Finanzkrise' } },
	{ start: 2020, name: { en: '🦠 COVID-19 pandemic', de: '🦠 COVID-19-Pandemie' } }
];
