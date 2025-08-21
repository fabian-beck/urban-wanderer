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
				'bürgerhaus'
			],
			commercial: [
				'commercial',
				'geschäftsgebäude',
				'geschäft',
				'shop',
				'store',
				'retail',
				'business',
				'laden'
			],
			office: [
				'office',
				'bürogebäude',
				'büro',
				'offices',
				'business center',
				'corporate',
				'verwaltung'
			],
			industrial: [
				'industrial',
				'industriegebäude',
				'industrie',
				'manufacturing',
				'production',
				'plant',
				'werk',
				'produktion'
			],
			warehouse: [
				'warehouse',
				'lagergebäude',
				'lager',
				'storage',
				'depot',
				'distribution',
				'logistik'
			],
			hospital: [
				'hospital',
				'krankenhaus',
				'klinik',
				'clinic',
				'medical center',
				'medical',
				'health',
				'gesundheit'
			],
			school: ['school', 'schule', 'primary school', 'elementary', 'grundschule', 'gymnasium'],
			university: [
				'university',
				'universität',
				'college',
				'campus',
				'hochschule',
				'akademie',
				'institute'
			],
			church: ['church', 'kirche', 'cathedral', 'chapel', 'dom', 'kapelle', 'gotteshaus'],
			temple: ['temple', 'tempel', 'shrine', 'sanctuary', 'heiligtum'],
			mosque: ['mosque', 'moschee', 'islamic', 'muslim'],
			synagogue: ['synagogue', 'synagoge', 'jewish', 'jüdisch'],
			hotel: ['hotel', 'inn', 'motel', 'lodge', 'resort', 'pension', 'gasthaus'],
			restaurant: [
				'restaurant',
				'cafe',
				'diner',
				'eatery',
				'bistro',
				'gaststätte',
				'lokal',
				'kneipe'
			],
			museum: ['museum', 'gallery', 'galerie', 'exhibition', 'ausstellung'],
			library: ['library', 'bibliothek', 'archive', 'archiv'],
			theater: ['theater', 'theatre', 'playhouse', 'opera', 'oper', 'schauspielhaus'],
			stadium: ['stadium', 'stadion', 'arena', 'sports venue', 'sportplatz'],
			gymnasium: ['gymnasium', 'turnhalle', 'gym', 'sports hall', 'sporthalle'],
			tower: ['tower', 'turm', 'spire', 'campanile', 'bell tower', 'glockenturm'],
			skyscraper: [
				'skyscraper',
				'wolkenkratzer',
				'high-rise',
				'hochhaus',
				'tower block',
				'hochhäuser'
			],
			apartment: [
				'apartment',
				'wohnhaus',
				'apartment building',
				'condo',
				'condominium',
				'flat',
				'mehrfamilienhaus'
			],
			villa: ['villa', 'manor', 'mansion', 'estate', 'anwesen', 'herrenhaus'],
			cottage: ['cottage', 'landhaus', 'cabin', 'hut', 'hütte', 'ferienhaus'],
			palace: ['palace', 'palast', 'royal', 'königlich', 'schloss'],
			castle: ['castle', 'burg', 'fortress', 'fort', 'festung', 'stronghold'],
			fortress: ['fortress', 'festung', 'fortification', 'citadel', 'zitadelle'],
			barn: ['barn', 'scheune', 'stable', 'stall', 'agricultural'],
			factory: ['factory', 'fabrik', 'mill', 'works', 'plant', 'werk', 'mühle'],
			station: ['station', 'bahnhof', 'train station', 'railway', 'terminal', 'depot', 'verkehr'],
			airport: ['airport', 'flughafenterminal', 'terminal', 'aviation', 'luftfahrt', 'flughafen'],
			garage: ['garage', 'parking', 'car park', 'parkhaus', 'stellplatz'],
			shed: ['shed', 'schuppen', 'outbuilding', 'storage shed', 'nebengebäude']
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
