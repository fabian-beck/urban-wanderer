<script>
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	// Architecture styles with background patterns
	const ARCHITECTURE_STYLES = {
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

	export let value = '';
	export let widthClass = 'col-span-1';
	export let containerWidth = 400; // Available container width

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
				'gotik revival',
				'neogotik',
				'neugotik'
			],
			neoromanesque: [
				'neoromanesque',
				'neo-romanesque',
				'neo romanesque',
				'romanesque revival',
				'neoromanisch',
				'neoromanik'
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

		// Check against all aliases - prioritize longer matches
		let bestMatch = null;
		let bestMatchLength = 0;

		for (const [styleKey, aliases] of Object.entries(styleAliases)) {
			for (const alias of aliases) {
				// Normalize alias for comparison
				const normalizedAlias = alias
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks

				// Exact alias match - always return immediately as this is the best possible match
				if (cleaned === normalizedAlias) {
					return ARCHITECTURE_STYLES[styleKey];
				}

				// Check if input contains the alias - prioritize longer matches
				if (cleaned.includes(normalizedAlias) && normalizedAlias.length > bestMatchLength) {
					bestMatch = ARCHITECTURE_STYLES[styleKey];
					bestMatchLength = normalizedAlias.length;
				}

				// Check if alias contains the input (for shorter inputs) - only if no better match exists
				if (normalizedAlias.includes(cleaned) && cleaned.length >= 4 && bestMatchLength === 0) {
					bestMatch = ARCHITECTURE_STYLES[styleKey];
					bestMatchLength = normalizedAlias.length;
				}
			}
		}

		if (bestMatch) {
			return bestMatch;
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
		// Always return the original value, don't use the matched style's name
		return value;
	}

	function getValueLength() {
		return value ? value.toString().length : 0;
	}

	// Determine display based on available width
	function shouldShowDescription(containerWidth, widthSpan) {
		const estimatedFactWidth = (containerWidth / 4) * widthSpan;
		// Need at least 140px to show description
		return estimatedFactWidth >= 140;
	}

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

	$: matchedStyle = parseArchitecturalStyle(value);
	$: widthSpan = getWidthSpan(widthClass);
	$: showDescription = shouldShowDescription(containerWidth, widthSpan);
	$: showBackgroundImage = shouldShowBackgroundImage(containerWidth, widthSpan);
	$: backgroundImage =
		matchedStyle && showBackgroundImage ? `/architecture-styles/${matchedStyle.image}` : null;
	$: styleName = getStyleName(matchedStyle);
</script>

<div
	class="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 px-2 py-1.5 text-center shadow-sm {widthClass}"
	style={backgroundImage
		? `background-image: url('${backgroundImage}'); background-size: 160px 160px; background-repeat: repeat; background-position: center;`
		: 'background-color: rgb(249 250 251);'}
>
	<div class="relative z-10 flex flex-col items-center">
		<span class="mb-0.5 rounded bg-white/80 px-1 text-xs font-medium leading-tight text-gray-600"
			>{getArchitectureStyleLabel()}</span
		>
		<div class="text-center">
			<div 
				class="rounded bg-white/80 px-1 font-semibold leading-tight text-gray-900"
				class:text-xl={getValueLength() <= 8}
				class:text-lg={getValueLength() > 8 && getValueLength() <= 15}
				class:text-base={getValueLength() > 15 && getValueLength() <= 25}
				class:text-sm={getValueLength() > 25 && getValueLength() <= 40}
				class:text-xs={getValueLength() > 40}
			>
				{styleName}
			</div>
			{#if matchedStyle && matchedStyle.description && showDescription}
				<div class="mt-1 rounded bg-white/80 px-1 text-xs leading-tight text-gray-600">
					{getDescription(matchedStyle)}
				</div>
			{/if}
		</div>
	</div>
</div>
