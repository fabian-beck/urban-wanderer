<script>
	import { ARCHITECTURE_STYLES } from '../../constants.js';
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	export let value = '';
	export let widthClass = 'col-span-1';

	function parseArchitecturalStyle(styleStr) {
		if (!styleStr || typeof styleStr !== 'string') return null;

		// Normalize input: remove emojis, extra spaces, punctuation, convert to lowercase
		const cleaned = styleStr
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

		// Define alternative names and translations for each style
		const styleAliases = {
			gothic: ['gothic', 'gotisch', 'gotik'],
			romanesque: ['romanesque', 'romanisch', 'romanik', 'roman'],
			renaissance: ['renaissance', 'renaissance', 'renascimento', 'rinascimento'],
			baroque: ['baroque', 'barock', 'barocco', 'barroco'],
			classical: ['classical', 'klassisch', 'classic', 'antique', 'greek', 'roman'],
			'art nouveau': [
				'art nouveau',
				'jugendstil',
				'modernisme',
				'sezessionsstil',
				'liberty',
				'modern style'
			],
			'art deco': ['art deco', 'art déco', 'deco', 'streamline', 'zigzag modern'],
			modernist: [
				'modernist',
				'modern',
				'moderne',
				'modernism',
				'international style',
				'internationaler stil'
			],
			bauhaus: ['bauhaus', 'functionalism', 'funktionalismus'],
			postmodern: ['postmodern', 'postmodernism', 'postmoderne', 'post modern', 'post-modern'],
			contemporary: ['contemporary', 'zeitgenössisch', 'modern', 'current', 'today'],
			brutalist: ['brutalist', 'brutalism', 'brutalismus', 'béton brut', 'raw concrete'],
			deconstructivist: ['deconstructivist', 'deconstructivism', 'dekonstruktivismus', 'decon'],
			byzantine: ['byzantine', 'byzantinisch', 'eastern orthodox', 'orthodox'],
			victorian: ['victorian', 'viktorianisch', 'edwardian', '19th century'],
			'beaux-arts': [
				'beaux-arts',
				'beaux arts',
				'beaux',
				'academic classicism',
				'école des beaux-arts'
			],

			// Neo variants with extensive aliases
			neoclassical: [
				'neoclassical',
				'neoclassicism',
				'klassizismus',
				'neoclassico',
				'classical revival'
			],
			neogothic: [
				'neogothic',
				'neo-gothic',
				'neo gothic',
				'gothic revival',
				'neogotisch',
				'gotik revival'
			],
			neoromanesque: [
				'neoromanesque',
				'neo-romanesque',
				'neo romanesque',
				'romanesque revival',
				'neoromanisch'
			],
			neorenaissance: [
				'neorenaissance',
				'neo-renaissance',
				'neo renaissance',
				'renaissance revival',
				'neorenaissance'
			],
			neobaroque: ['neobaroque', 'neo-baroque', 'neo baroque', 'baroque revival', 'neobarock'],
			neobyzantine: [
				'neobyzantine',
				'neo-byzantine',
				'neo byzantine',
				'byzantine revival',
				'neobyzantinisch'
			],
			neovictorian: [
				'neovictorian',
				'neo-victorian',
				'neo victorian',
				'victorian revival',
				'neoviktorianisch'
			]
		};

		// Check exact matches first
		if (ARCHITECTURE_STYLES[cleaned]) {
			return ARCHITECTURE_STYLES[cleaned];
		}

		// Check against all aliases
		for (const [styleKey, aliases] of Object.entries(styleAliases)) {
			for (const alias of aliases) {
				// Normalize alias for comparison
				const normalizedAlias = alias
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks

				// Exact alias match
				if (cleaned === normalizedAlias) {
					return ARCHITECTURE_STYLES[styleKey];
				}

				// Check if input contains the alias
				if (cleaned.includes(normalizedAlias)) {
					return ARCHITECTURE_STYLES[styleKey];
				}

				// Check if alias contains the input (for shorter inputs)
				if (normalizedAlias.includes(cleaned) && cleaned.length >= 4) {
					return ARCHITECTURE_STYLES[styleKey];
				}
			}
		}

		// Fallback: check original key-based partial matching
		for (const [key, style] of Object.entries(ARCHITECTURE_STYLES)) {
			if (cleaned.includes(key) || key.includes(cleaned)) {
				return style;
			}
		}

		return null;
	}

	function getArchitectureStyleLabel() {
		const $language = get(preferences).lang;
		return $language === 'de' ? 'Baustil' : 'Architecture Style';
	}

	function getDescription(style) {
		// Currently descriptions are only in English in the constants file
		// This function is prepared for future bilingual support
		const $language = get(preferences).lang;
		if (typeof style.description === 'object' && style.description[$language]) {
			return style.description[$language];
		}
		return style.description; // fallback to English
	}

	function getStyleName(style) {
		if (!style) return value;
		const $language = get(preferences).lang;
		if (typeof style.name === 'object' && style.name[$language]) {
			return style.name[$language];
		}
		return style.name; // fallback to English
	}

	$: matchedStyle = parseArchitecturalStyle(value);
	$: backgroundImage = matchedStyle ? `/architecture-styles/${matchedStyle.image}` : null;
	$: styleName = getStyleName(matchedStyle);
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
			>{getArchitectureStyleLabel()}</span
		>
		<div class="text-center">
			<div
				class="text-base font-semibold leading-tight text-gray-900"
				style="text-shadow: 0 0 4px #fff, 0 0 8px #fff, 0 0 12px #fff, 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;"
			>
				{styleName}
			</div>
			{#if matchedStyle && matchedStyle.description}
				<div
					class="mt-1 text-xs leading-tight text-gray-600"
					style="text-shadow: 0 0 3px #fff, 0 0 6px #fff, 0 0 10px #fff, 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;"
				>
					{getDescription(matchedStyle)}
				</div>
			{/if}
		</div>
	</div>
</div>
