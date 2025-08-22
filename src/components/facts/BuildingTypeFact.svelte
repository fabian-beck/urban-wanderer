<script>
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	// Building types with background patterns
	const BUILDING_TYPES = {
		residential: {
			name: { en: 'Residential', de: 'Wohngebäude' },
			image: 'residential.png'
		},
		bank: {
			name: { en: 'Bank', de: 'Bank' },
			image: 'bank.png'
		},
		commercial: {
			name: { en: 'Commercial', de: 'Geschäftsgebäude' },
			image: 'commercial.png'
		},
		office: {
			name: { en: 'Office', de: 'Bürogebäude' },
			image: 'office.png'
		},
		industrial: {
			name: { en: 'Industrial', de: 'Industriegebäude' },
			image: 'industrial.png'
		},
		warehouse: {
			name: { en: 'Warehouse', de: 'Lagergebäude' },
			image: 'warehouse.png'
		},
		hospital: {
			name: { en: 'Hospital', de: 'Krankenhaus' },
			image: 'hospital.png'
		},
		school: {
			name: { en: 'School', de: 'Schule' },
			image: 'school.png'
		},
		university: {
			name: { en: 'University', de: 'Universität' },
			image: 'university.png'
		},
		church: {
			name: { en: 'Church', de: 'Kirche' },
			image: 'church.png'
		},
		temple: {
			name: { en: 'Temple', de: 'Tempel' },
			image: 'temple.png'
		},
		mosque: {
			name: { en: 'Mosque', de: 'Moschee' },
			image: 'mosque.png'
		},
		synagogue: {
			name: { en: 'Synagogue', de: 'Synagoge' },
			image: 'synagogue.png'
		},
		hotel: {
			name: { en: 'Hotel', de: 'Hotel' },
			image: 'hotel.png'
		},
		restaurant: {
			name: { en: 'Restaurant', de: 'Restaurant' },
			image: 'restaurant.png'
		},
		museum: {
			name: { en: 'Museum', de: 'Museum' },
			image: 'museum.png'
		},
		library: {
			name: { en: 'Library', de: 'Bibliothek' },
			image: 'library.png'
		},
		theater: {
			name: { en: 'Theater', de: 'Theater' },
			image: 'theater.png'
		},
		stadium: {
			name: { en: 'Stadium', de: 'Stadion' },
			image: 'stadium.png'
		},
		gymnasium: {
			name: { en: 'Gymnasium', de: 'Turnhalle' },
			image: 'gymnasium.png'
		},
		tower: {
			name: { en: 'Tower', de: 'Turm' },
			image: 'tower.png'
		},
		skyscraper: {
			name: { en: 'Skyscraper', de: 'Wolkenkratzer' },
			image: 'skyscraper.png'
		},
		apartment: {
			name: { en: 'Apartment Building', de: 'Wohnhaus' },
			image: 'apartment.png'
		},
		villa: {
			name: { en: 'Villa', de: 'Villa' },
			image: 'villa.png'
		},
		cottage: {
			name: { en: 'Cottage', de: 'Landhaus' },
			image: 'cottage.png'
		},
		palace: {
			name: { en: 'Palace', de: 'Palast' },
			image: 'palace.png'
		},
		castle: {
			name: { en: 'Castle', de: 'Burg' },
			image: 'castle.png'
		},
		fortress: {
			name: { en: 'Fortress', de: 'Festung' },
			image: 'fortress.png'
		},
		barn: {
			name: { en: 'Barn', de: 'Scheune' },
			image: 'barn.png'
		},
		factory: {
			name: { en: 'Factory', de: 'Fabrik' },
			image: 'factory.png'
		},
		station: {
			name: { en: 'Station', de: 'Bahnhof' },
			image: 'station.png'
		},
		airport: {
			name: { en: 'Airport Terminal', de: 'Flughafenterminal' },
			image: 'airport.png'
		},
		garage: {
			name: { en: 'Garage', de: 'Garage' },
			image: 'garage.png'
		},
		shed: {
			name: { en: 'Shed', de: 'Schuppen' },
			image: 'shed.png'
		},
		'city-hall': {
			name: { en: 'City Hall', de: 'Rathaus' },
			image: 'city-hall.png'
		},
		courthouse: {
			name: { en: 'Courthouse', de: 'Gerichtsgebäude' },
			image: 'courthouse.png'
		},
		'control-center': {
			name: { en: 'Control Center', de: 'Verkehrszentrale' },
			image: 'office.png'
		}
	};

	export let value = '';
	export let widthClass = 'col-span-1';
	export let containerWidth = 400; // Available container width

	function parseBuildingType(typeStr) {
		if (!typeStr || typeof typeStr !== 'string') return null;

		// Normalize input: remove emojis, extra spaces, punctuation, convert to lowercase
		const cleaned = typeStr
			.trim()
			.toLowerCase()
			.normalize('NFD') // Normalize Unicode to decomposed form
			.replace(
				/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
				''
			) // Remove emojis
			.replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
			.replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
			.replace(/\s+/g, ' ') // Normalize multiple spaces
			.trim();

		// Define alternative names and translations for each building type
		const typeAliases = {
			residential: [
				'residential',
				'wohngebäude',
				'wohnhaus',
				'housing',
				'home',
				'residence',
				'dwelling',
				'wohnung',
				'bürgerhaus',
				'living',
				'wohnen',
				'residential building',
				'wohnbau',
				'residential complex',
				'wohnkomplex'
			],
			bank: [
				'bank',
				'financial',
				'finanziell',
				'banking',
				'bankwesen',
				'financial institution',
				'finanzinstitut',
				'credit union',
				'kreditgenossenschaft',
				'savings',
				'sparkasse'
			],
			commercial: [
				'commercial',
				'geschäftsgebäude',
				'geschäft',
				'shop',
				'store',
				'retail',
				'business',
				'laden',
				'handel',
				'einzelhandel',
				'shopping',
				'einkaufen',
				'commercial building',
				'handelszentrum',
				'shopping center',
				'einkaufszentrum'
			],
			office: [
				'office',
				'bürogebäude',
				'büro',
				'offices',
				'business center',
				'corporate',
				'verwaltung',
				'administrative',
				'verwaltungsgebäude',
				'office building',
				'bürokomplex',
				'corporate building',
				'geschäftszentrum',
				'business complex'
			],
			industrial: [
				'industrial',
				'industriegebäude',
				'industrie',
				'manufacturing',
				'production',
				'plant',
				'werk',
				'produktion',
				'herstellung',
				'industrial complex',
				'industriekomplex',
				'production facility',
				'produktionsstätte',
				'manufacturing plant',
				'produktionswerk'
			],
			warehouse: [
				'warehouse',
				'lagergebäude',
				'lager',
				'storage',
				'depot',
				'distribution',
				'logistik',
				'storage facility',
				'lagerhalle',
				'distribution center',
				'verteilzentrum',
				'logistics',
				'logistikzentrum',
				'storage building'
			],
			hospital: [
				'hospital',
				'krankenhaus',
				'klinik',
				'clinic',
				'medical center',
				'medical',
				'health',
				'gesundheit',
				'medical facility',
				'medizinische einrichtung',
				'healthcare',
				'gesundheitswesen',
				'health center',
				'gesundheitszentrum',
				'medical building'
			],
			school: [
				'school',
				'schule',
				'primary school',
				'elementary',
				'grundschule',
				'gymnasium',
				'bildung',
				'education',
				'educational',
				'bildungseinrichtung',
				'lehreinrichtung',
				'educational facility',
				'schulgebäude'
			],
			university: [
				'university',
				'universität',
				'college',
				'campus',
				'hochschule',
				'akademie',
				'institute',
				'higher education',
				'hochschulbildung',
				'fachhochschule',
				'technical college',
				'technische hochschule',
				'educational institution',
				'forschungsinstitut',
				'research institute'
			],
			church: [
				'church',
				'kirche',
				'cathedral',
				'chapel',
				'dom',
				'kapelle',
				'gotteshaus',
				'christian',
				'christlich',
				'religious',
				'religiös',
				'parish',
				'gemeinde',
				'basilica',
				'basilika'
			],
			temple: [
				'temple',
				'tempel',
				'shrine',
				'sanctuary',
				'heiligtum',
				'buddhist',
				'buddhistisch',
				'hindu',
				'spiritual',
				'spirituell',
				'worship',
				'anbetung',
				'sacred'
			],
			mosque: [
				'mosque',
				'moschee',
				'islamic',
				'muslim',
				'islamisch',
				'muslimisch',
				'islam',
				'masjid'
			],
			synagogue: [
				'synagogue',
				'synagoge',
				'jewish',
				'jüdisch',
				'judaism',
				'judentum',
				'hebrew',
				'hebräisch',
				'temple'
			],
			hotel: [
				'hotel',
				'inn',
				'motel',
				'lodge',
				'resort',
				'pension',
				'gasthaus',
				'hospitality',
				'gastgewerbe',
				'accommodation',
				'unterkunft',
				'guesthouse',
				'gästehaus',
				'hostel'
			],
			restaurant: [
				'restaurant',
				'cafe',
				'diner',
				'eatery',
				'bistro',
				'gaststätte',
				'lokal',
				'kneipe',
				'food service',
				'gastronomie',
				'dining',
				'speisen',
				'bar',
				'pub',
				'cafeteria',
				'kantein'
			],
			museum: [
				'museum',
				'gallery',
				'galerie',
				'exhibition',
				'ausstellung',
				'cultural',
				'kulturell',
				'art',
				'kunst',
				'culture',
				'kultur',
				'collection',
				'sammlung'
			],
			library: [
				'library',
				'bibliothek',
				'archive',
				'archiv',
				'information',
				'information center',
				'informationszentrum',
				'knowledge',
				'wissen',
				'books',
				'bücher',
				'reading'
			],
			theater: [
				'theater',
				'theatre',
				'playhouse',
				'opera',
				'oper',
				'schauspielhaus',
				'performance',
				'aufführung',
				'entertainment',
				'unterhaltung',
				'cultural center',
				'kulturzentrum',
				'concert hall',
				'konzertsaal'
			],
			stadium: [
				'stadium',
				'stadion',
				'arena',
				'sports venue',
				'sportplatz',
				'sports',
				'sport',
				'athletic',
				'athletik',
				'sports complex',
				'sportkomplex',
				'sports facility',
				'sportanlage'
			],
			gymnasium: [
				'gymnasium',
				'turnhalle',
				'gym',
				'sports hall',
				'sporthalle',
				'fitness',
				'fitness center',
				'fitnesszentrum',
				'exercise',
				'übung',
				'workout',
				'training'
			],
			tower: [
				'tower',
				'turm',
				'spire',
				'campanile',
				'bell tower',
				'glockenturm',
				'tall structure',
				'hohes bauwerk',
				'observation tower',
				'aussichtsturm',
				'clock tower',
				'uhrturm'
			],
			skyscraper: [
				'skyscraper',
				'wolkenkratzer',
				'high-rise',
				'hochhaus',
				'tower block',
				'hochhäuser',
				'tall building',
				'hohes gebäude',
				'multi-story',
				'mehrstöckig',
				'vertical',
				'vertikal'
			],
			apartment: [
				'apartment',
				'wohnhaus',
				'apartment building',
				'condo',
				'condominium',
				'flat',
				'mehrfamilienhaus',
				'multi-family',
				'mehrgenerationen',
				'residential complex',
				'wohnkomplex',
				'living complex',
				'wohnanlage'
			],
			villa: [
				'villa',
				'manor',
				'mansion',
				'estate',
				'anwesen',
				'herrenhaus',
				'luxury',
				'luxus',
				'luxury home',
				'luxushaus',
				'country house',
				'landhaus',
				'stately home'
			],
			cottage: [
				'cottage',
				'landhaus',
				'cabin',
				'hut',
				'hütte',
				'ferienhaus',
				'small house',
				'kleines haus',
				'vacation home',
				'urlaubshaus',
				'country cottage',
				'landhütte',
				'chalet'
			],
			palace: [
				'palace',
				'palast',
				'royal',
				'königlich',
				'schloss',
				'royal palace',
				'königspalast',
				'grand',
				'groß',
				'magnificent',
				'prächtig',
				'imperial',
				'kaiserlich'
			],
			castle: [
				'castle',
				'burg',
				'fortress',
				'fort',
				'festung',
				'stronghold',
				'medieval',
				'mittelalterlich',
				'fortification',
				'befestigung',
				'defensive',
				'verteidigung',
				'historic castle',
				'historische burg'
			],
			fortress: [
				'fortress',
				'festung',
				'fortification',
				'citadel',
				'zitadelle',
				'military',
				'militärisch',
				'defense',
				'verteidigung',
				'stronghold',
				'bastion'
			],
			barn: [
				'barn',
				'scheune',
				'stable',
				'stall',
				'agricultural',
				'landwirtschaft',
				'farm',
				'bauernhof',
				'farming',
				'landwirtschaftlich',
				'rural',
				'ländlich'
			],
			factory: [
				'factory',
				'fabrik',
				'mill',
				'works',
				'plant',
				'werk',
				'mühle',
				'production plant',
				'produktionsanlage',
				'manufacturing facility',
				'fertigungsanlage',
				'processing plant',
				'verarbeitungsanlage'
			],
			station: [
				'station',
				'bahnhof',
				'train station',
				'railway',
				'terminal',
				'depot',
				'verkehr',
				'transportation',
				'transport',
				'public transport',
				'öffentlicher verkehr',
				'transit',
				'metro',
				'u-bahn'
			],
			airport: [
				'airport',
				'flughafenterminal',
				'terminal',
				'aviation',
				'luftfahrt',
				'flughafen',
				'air travel',
				'flugreisen',
				'flight',
				'flug',
				'airfield',
				'flugplatz',
				'aerodrome'
			],
			garage: [
				'garage',
				'parking',
				'car park',
				'parkhaus',
				'stellplatz',
				'automotive',
				'automobil',
				'vehicle storage',
				'fahrzeugaufbewahrung',
				'parking facility',
				'parkanlage',
				'car storage'
			],
			shed: [
				'shed',
				'schuppen',
				'outbuilding',
				'storage shed',
				'nebengebäude',
				'utility building',
				'lagerschuppen',
				'small storage',
				'kleines lager',
				'workshop',
				'werkstatt',
				'tool shed',
				'geräteschuppen'
			],
			'city-hall': [
				'city hall',
				'rathaus',
				'town hall',
				'municipal',
				'gemeinde',
				'stadtverwaltung',
				'government',
				'regierung',
				'civic',
				'bürgerlich',
				'administration',
				'verwaltung',
				'municipal building',
				'gemeindegebäude'
			],
			courthouse: [
				'courthouse',
				'gerichtsgebäude',
				'court',
				'gericht',
				'justiz',
				'judicial',
				'justice',
				'gerechtigkeit',
				'legal',
				'rechtlich',
				'law',
				'recht',
				'tribunal',
				'court building',
				'justizpalast'
			],
			'control-center': [
				'control center',
				'verkehrszentrale',
				'control centre',
				'traffic control',
				'verkehrsleitzentrale',
				'leitzentrale',
				'zentrale',
				'leitstelle',
				'control station',
				'kontrollzentrum',
				'steuerungszentrale',
				'operational center',
				'betriebszentrale'
			]
		};

		// Check exact matches first
		if (BUILDING_TYPES[cleaned]) {
			return BUILDING_TYPES[cleaned];
		}

		// Check against all aliases
		for (const [typeKey, aliases] of Object.entries(typeAliases)) {
			for (const alias of aliases) {
				// Normalize alias for comparison
				const normalizedAlias = alias
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks

				// Exact alias match
				if (cleaned === normalizedAlias) {
					return BUILDING_TYPES[typeKey];
				}

				// Check if input contains the alias
				if (cleaned.includes(normalizedAlias)) {
					return BUILDING_TYPES[typeKey];
				}

				// Check if alias contains the input (for shorter inputs)
				if (normalizedAlias.includes(cleaned) && cleaned.length >= 4) {
					return BUILDING_TYPES[typeKey];
				}
			}
		}

		// Fallback: check original key-based partial matching
		for (const [key, type] of Object.entries(BUILDING_TYPES)) {
			if (cleaned.includes(key) || key.includes(cleaned)) {
				return type;
			}
		}

		return null;
	}

	function getBuildingTypeLabel() {
		const $language = get(preferences).lang;
		return $language === 'de' ? 'Gebäudetyp' : 'Building Type';
	}

	function getTypeName(type) {
		if (!type) return value;
		const $language = get(preferences).lang;
		if (typeof type.name === 'object' && type.name[$language]) {
			return type.name[$language];
		}
		return type.name; // fallback to English
	}

	// Determine display based on available width
	function shouldShowBackgroundImage(containerWidth, widthSpan) {
		const estimatedFactWidth = (containerWidth / 4) * widthSpan;
		// Need at least 100px to show background pattern
		return estimatedFactWidth >= 100;
	}

	// Extract width span from widthClass
	function getWidthSpan(widthClass) {
		const match = widthClass.match(/col-span-(\d+)/);
		return match ? parseInt(match[1]) : 1;
	}

	$: matchedType = parseBuildingType(value);
	$: widthSpan = getWidthSpan(widthClass);
	$: showBackgroundImage = shouldShowBackgroundImage(containerWidth, widthSpan);
	$: backgroundImage =
		matchedType && showBackgroundImage ? `/building-types/${matchedType.image}` : null;
	$: typeName = getTypeName(matchedType);
</script>

<div
	class="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 px-2 py-1.5 text-center shadow-sm {widthClass}"
	style={backgroundImage
		? `background-image: url('${backgroundImage}'); background-size: 160px 160px; background-repeat: repeat; background-position: center;`
		: 'background-color: rgb(249 250 251);'}
>
	<!-- Semi-transparent overlay for better text readability -->
	{#if backgroundImage}
		<div class="absolute inset-0 bg-white/40 backdrop-blur-[0.5px]"></div>
	{/if}

	<div class="relative z-10 flex flex-col items-center">
		<span
			class="mb-0.5 text-xs font-medium leading-tight text-gray-600"
			style="text-shadow: 0 0 3px #fff, 0 0 6px #fff, 0 0 10px #fff, 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;"
			>{getBuildingTypeLabel()}</span
		>
		<div class="text-center">
			<div
				class="text-base font-semibold leading-tight text-gray-900"
				style="text-shadow: 0 0 4px #fff, 0 0 8px #fff, 0 0 12px #fff, 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;"
			>
				{typeName}
			</div>
		</div>
	</div>
</div>
