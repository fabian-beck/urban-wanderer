<script>
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	// Building materials with background patterns
	const MATERIALS = {
		brick: {
			name: { en: 'Brick', de: 'Ziegel' },
			image: 'brick.png'
		},
		stone: {
			name: { en: 'Stone', de: 'Stein' },
			image: 'stone.png'
		},
		wood: {
			name: { en: 'Wood', de: 'Holz' },
			image: 'wood.png'
		},
		concrete: {
			name: { en: 'Concrete', de: 'Beton' },
			image: 'concrete.png'
		},
		steel: {
			name: { en: 'Steel', de: 'Stahl' },
			image: 'steel.png'
		},
		glass: {
			name: { en: 'Glass', de: 'Glas' },
			image: 'glass.png'
		},
		marble: {
			name: { en: 'Marble', de: 'Marmor' },
			image: 'marble.png'
		},
		granite: {
			name: { en: 'Granite', de: 'Granit' },
			image: 'granite.png'
		},
		limestone: {
			name: { en: 'Limestone', de: 'Kalkstein' },
			image: 'limestone.png'
		},
		sandstone: {
			name: { en: 'Sandstone', de: 'Sandstein' },
			image: 'sandstone.png'
		},
		timber: {
			name: { en: 'Timber', de: 'Bauholz' },
			image: 'timber.png'
		},
		'reinforced-concrete': {
			name: { en: 'Reinforced Concrete', de: 'Stahlbeton' },
			image: 'reinforced_concrete.png'
		},
		masonry: {
			name: { en: 'Masonry', de: 'Mauerwerk' },
			image: 'masonry.png'
		},
		'cast-iron': {
			name: { en: 'Cast Iron', de: 'Gusseisen' },
			image: 'cast_iron.png'
		}
	};

	export let value = [];
	export let widthClass = 'col-span-1';
	export let containerWidth = 400; // Available container width

	function parseMaterial(materialStr) {
		if (!materialStr || typeof materialStr !== 'string') return null;

		// Normalize input: remove emojis, extra spaces, punctuation, convert to lowercase
		const cleaned = materialStr
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

		// Define alternative names and translations for each building material
		const materialAliases = {
			brick: ['brick', 'ziegel', 'bricks', 'ziegelstein', 'backstein', 'klinker', 'clay brick'],
			stone: ['stone', 'stein', 'naturstein', 'stones', 'steine', 'fels', 'rock', 'natural stone'],
			wood: ['wood', 'holz', 'wooden', 'hölzern', 'lumber'],
			concrete: ['concrete', 'beton', 'cement', 'zement'],
			steel: ['steel', 'stahl', 'structural steel', 'baustahl', 'iron', 'eisen'],
			glass: ['glass', 'glas', 'glazing', 'verglasung', 'curtain wall', 'glasfassade'],
			marble: ['marble', 'marmor', 'marble stone', 'marmorstein'],
			granite: ['granite', 'granit', 'granite stone', 'granitstein'],
			limestone: ['limestone', 'kalkstein', 'lime stone', 'kalk'],
			sandstone: ['sandstone', 'sandstein', 'sand stone'],
			timber: ['timber', 'bauholz', 'structural timber', 'construction timber', 'wood frame', 'holzbau'],
			'reinforced-concrete': ['reinforced concrete', 'stahlbeton', 'reinforced-concrete', 'rc', 'ferro concrete'],
			masonry: ['masonry', 'mauerwerk', 'stonework', 'brickwork', 'stone masonry', 'brick masonry'],
			'cast-iron': ['cast iron', 'gusseisen', 'cast-iron', 'wrought iron', 'schmiedeeisen']
		};

		// Check exact matches first
		if (MATERIALS[cleaned]) {
			return MATERIALS[cleaned];
		}

		// Check against all aliases - prioritize longer matches
		let bestMatch = null;
		let bestMatchLength = 0;

		for (const [materialKey, aliases] of Object.entries(materialAliases)) {
			for (const alias of aliases) {
				// Normalize alias for comparison
				const normalizedAlias = alias
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks

				// Exact alias match - always return immediately as this is the best possible match
				if (cleaned === normalizedAlias) {
					return MATERIALS[materialKey];
				}

				// Check if input contains the alias - prioritize longer matches
				if (cleaned.includes(normalizedAlias) && normalizedAlias.length > bestMatchLength) {
					bestMatch = MATERIALS[materialKey];
					bestMatchLength = normalizedAlias.length;
				}

				// Check if alias contains the input (for shorter inputs) - only if no better match exists
				if (normalizedAlias.includes(cleaned) && cleaned.length >= 3 && bestMatchLength === 0) {
					bestMatch = MATERIALS[materialKey];
					bestMatchLength = normalizedAlias.length;
				}
			}
		}

		if (bestMatch) {
			return bestMatch;
		}

		// Fallback: check original key-based partial matching
		for (const [key, material] of Object.entries(MATERIALS)) {
			if (cleaned.includes(key) || key.includes(cleaned)) {
				return material;
			}
		}

		return null;
	}

	function getMaterialLabel() {
		const $language = get(preferences).lang;
		return $language === 'de' ? 'Material' : 'Material';
	}

	function formatMaterials(materials) {
		if (!materials || !Array.isArray(materials) || materials.length === 0) {
			return '';
		}
		
		if (materials.length === 1) {
			return materials[0].toString();
		}
		
		// Join with bullet separator
		return materials.map(item => item.toString().trim()).filter(item => item).join(' • ');
	}

	function getValueLength() {
		const formattedValue = formatMaterials(value);
		return formattedValue.length;
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

	// Parse all materials for background images
	function parseAllMaterials(materials) {
		if (!materials || !Array.isArray(materials) || materials.length === 0) {
			return [];
		}
		return materials.map(material => parseMaterial(material)).filter(m => m !== null);
	}

	$: parsedMaterials = parseAllMaterials(value);
	$: widthSpan = getWidthSpan(widthClass);
	$: showBackgroundImage = shouldShowBackgroundImage(containerWidth, widthSpan);
	$: formattedValue = formatMaterials(value);
	$: hasMultipleMaterials = parsedMaterials.length > 1;
</script>

<div
	class="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 px-2 py-1.5 text-center shadow-sm {widthClass}"
	style={!showBackgroundImage || parsedMaterials.length === 0 ? 'background-color: rgb(249 250 251);' : ''}
>
	<!-- Background layers for multiple materials -->
	{#if showBackgroundImage && hasMultipleMaterials}
		{#each parsedMaterials as material, i}
			<div
				class="absolute inset-0"
				style={`
					left: ${(i / parsedMaterials.length) * 100}%;
					width: ${100 / parsedMaterials.length}%;
					background-image: url('/materials/${material.image}');
					background-size: 160px 160px;
					background-repeat: repeat;
					background-position: center;
				`}
			></div>
		{/each}
	{:else if showBackgroundImage && parsedMaterials.length === 1}
		<!-- Single material background -->
		<div
			class="absolute inset-0"
			style={`
				background-image: url('/materials/${parsedMaterials[0].image}');
				background-size: 160px 160px;
				background-repeat: repeat;
				background-position: center;
			`}
		></div>
	{/if}

	<!-- Content overlay -->
	<div class="relative z-10 flex flex-col items-center">
		<span
			class="mb-0.5 text-xs font-medium leading-tight text-gray-600 bg-white/80 px-1 rounded"
			>{getMaterialLabel()}</span
		>
		<div class="text-center">
			<div
				class="font-semibold leading-tight text-gray-900 bg-white/80 px-1 rounded"
				class:text-xl={getValueLength() <= 8}
				class:text-lg={getValueLength() > 8 && getValueLength() <= 15}
				class:text-base={getValueLength() > 15 && getValueLength() <= 25}
				class:text-sm={getValueLength() > 25 && getValueLength() <= 40}
				class:text-xs={getValueLength() > 40}
			>
				{formattedValue}
			</div>
		</div>
	</div>
</div>