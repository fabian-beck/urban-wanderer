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
		properties: ['constructed', 'length', 'bridge_type', 'clearance_height', 'material', 'height']
	},
	BUILDING: {
		emoji: '🏢',
		description:
			'Building of any kind (e.g., a house, a skyscraper, a factory, a lighthouse) or a part of a building (e.g., a portal, a room)',
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
		properties: ['constructed', 'area', 'architecture_style', 'material', 'building_type', 'visit_count']
	},
	CEMETERY: {
		emoji: '⚰️',
		description: 'Cemetery or tomb',
		radius: 200,
		properties: ['area', 'established']
	},
	CITY_HALL: {
		emoji: '🏛️',
		description: 'City hall or municipal building',
		radius: 150,
		properties: ['established', 'employee_count', 'building_type', 'architecture_style', 'height', 'material']
	},
	COURTHOUSE: {
		emoji: '⚖️',
		description: 'Courthouse or judicial building',
		radius: 150,
		properties: ['established', 'employee_count', 'building_type', 'architecture_style', 'height']
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
		properties: ['established', 'employee_count', 'building_type', 'architecture_style', 'height']
	},
	HARBOUR: {
		emoji: '⚓',
		description: 'Harbour',
		radius: 300,
		properties: ['constructed', 'area', 'yearly_tonnage', 'good_types', 'employee_count']
	},
	HOSPITAL: {
		emoji: '🏥',
		description: 'Medical facility (e.g., a hospital, a clinic)',
		radius: 200,
		properties: [
			'established',
			'employee_count',
			'bed_count',
			'building_type',
			'architecture_style',
			'height'
		]
	},
	HOTEL: {
		emoji: '🏨',
		description: 'Hotel',
		radius: 200,
		properties: [
			'established',
			'employee_count',
			'room_count',
			'material',
			'architecture_style',
			'height',
			'building_type'
		]
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
		properties: ['established', 'visit_count', 'employee_count', 'building_type', 'architecture_style', 'height']
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
		properties: ['established', 'height', 'architecture_style', 'building_type', 'capacity']
	},
	SPORTS_FACILITY: {
		emoji: '🏟️',
		description: 'Sports facility (e.g., a stadium, a gym)',
		radius: 200,
		properties: ['established', 'capacity', 'building_type', 'architecture_style', 'height']
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
		properties: [
			'constructed',
			'area',
			'yearly_passenger_count',
			'main_destinations',
			'building_type',
			'architecture_style',
			'height'
		]
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
		properties: [
			'established',
			'student_count',
			'employee_count',
			'building_type',
			'architecture_style',
			'height'
		]
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
		type: 'array',
		items: {
			type: 'string'
		},
		description: 'materials used (e.g., ["🧱 brick", "🪨 stone", "🪵 wood"]), if available; use emojis; restrict to most dominant ones.'
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
