<script>
	import Fact from './Fact.svelte';
	import HeightFact from './HeightFact.svelte';
	import ArchitectureStyleFact from './ArchitectureStyleFact.svelte';
	import BuildingTypeFact from './BuildingTypeFact.svelte';
	import YearFact from './YearFact.svelte';
	import { extractPlaceFacts } from '../../util/ai-facts.js';
	import { coordinates } from '../../stores.js';
	import { Spinner } from 'flowbite-svelte';
	import {
		CLASSES,
		PROPERTIES,
		PROPERTY_TRANSLATIONS,
		HISTORICAL_EVENTS
	} from '../../constants.js';
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';

	export let place;

	let facts = null;
	let factsLoading = false;
	let containerElement;
	let containerWidth = 400; // Default baseline width
	let resizeTimeout;

	// Define which properties represent years
	const YEAR_PROPERTIES = ['constructed', 'created', 'discovered', 'established'];

	// Track container width changes with debounced updates
	let debouncedWidth = containerWidth;

	onMount(() => {
		if (containerElement) {
			const resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					containerWidth = entry.contentRect.width;

					// Debounce the width updates to avoid excessive recalculations
					clearTimeout(resizeTimeout);
					resizeTimeout = setTimeout(() => {
						debouncedWidth = containerWidth;
					}, 150); // 150ms delay
				}
			});
			resizeObserver.observe(containerElement);

			// Initial width measurement
			containerWidth = containerElement.offsetWidth;
			debouncedWidth = containerWidth;

			return () => {
				resizeObserver.disconnect();
				clearTimeout(resizeTimeout);
			};
		}
	});

	// Force layout recalculation when debounced width changes
	let layoutTrigger = 0;
	$: if (debouncedWidth) {
		layoutTrigger++;
	}

	export const loadFacts = async () => {
		factsLoading = true;

		const factsProperties = {
			other_facts: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						label: {
							type: 'string',
							description: 'short label for the fact'
						},
						description: {
							type: 'string',
							description: 'the fact itself, described as short as possible, max 30 characters'
						}
					},
					required: ['label', 'description'],
					additionalProperties: false,
					description:
						'list of additional facts (max 5 facts); no redundancies, no links; keep the list short and concise'
				}
			}
		};

		const classProperties = CLASSES[place.cls]?.properties || [];
		for (const prop of classProperties) {
			if (PROPERTIES[prop]) {
				factsProperties[prop] = PROPERTIES[prop];
			}
		}

		facts = await extractPlaceFacts(place, factsProperties, get(coordinates), get(preferences));
		factsLoading = false;
	};

	function formatLabel(key) {
		const $language = get(preferences).lang;
		if (PROPERTY_TRANSLATIONS[key] && PROPERTY_TRANSLATIONS[key][$language]) {
			return PROPERTY_TRANSLATIONS[key][$language];
		}
		return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
	}

	// Helper function to check if a construction year has historical context
	function hasHistoricalContext(value) {
		const year = parseInt(value);
		if (isNaN(year) || year <= -3000 || year >= 2100) return false;

		// Find events that are contemporaneous or close to the construction year
		let minDistance = Infinity;

		for (const event of HISTORICAL_EVENTS) {
			let distance;

			if (event.end) {
				// Event with duration
				if (year >= event.start && year <= event.end) {
					return true; // Year falls within event period
				} else if (year < event.start) {
					distance = event.start - year;
				} else {
					distance = year - event.end;
				}
			} else {
				// Single year event
				distance = Math.abs(year - event.start);
			}

			if (distance < minDistance) {
				minDistance = distance;
			}
		}

		return minDistance <= 10; // Within 10 years
	}

	function getLongestWordLength(text) {
		if (!text) return 0;
		const words = text.toString().split(/\s+/);
		return Math.max(...words.map((word) => word.length));
	}

	function getMinWidthSpan(label, value, key = null) {
		// Scale base requirements based on container width
		const baseWidth = 400;
		const responsiveWidthScale = debouncedWidth / baseWidth;

		// Height facts need space for comparison images, but can be smaller on wider screens
		if (key === 'height') {
			// At 400px: 3 quarters, at 500px+: 2 quarters, at 700px+: can be 1 quarter
			if (responsiveWidthScale >= 1.75) return 1; // 700px+
			if (responsiveWidthScale >= 1.25) return 2; // 500px+
			return 3; // <500px
		}

		// Architecture style facts need more space for description
		if (key === 'architecture_style') {
			// Can scale down to 1 quarter on very wide screens
			if (responsiveWidthScale >= 1.75) return 1; // 700px+
			return 2;
		}

		// Building type facts are simpler, need less space
		if (key === 'building_type') {
			// Can scale down to 1 quarter on wider screens
			if (responsiveWidthScale >= 1.25) return 1; // 500px+
			return 2;
		}

		// Year-based facts need more space if they have historical context
		if (YEAR_PROPERTIES.includes(key)) {
			const hasContext = hasHistoricalContext(value);
			if (hasContext) {
				// At 400px: 2 quarters, at 500px+: 1 quarter
				if (responsiveWidthScale >= 1.25) return 1; // 500px+
				return 2; // <500px
			}
			return 1;
		}

		const labelStr = label?.toString() || '';
		const valueStr = value?.toString() || '';

		const totalLength = labelStr.length + valueStr.length;
		const longestLabelWord = getLongestWordLength(labelStr);
		const longestValueWord = getLongestWordLength(valueStr);
		const longestWord = Math.max(longestLabelWord, longestValueWord);

		// Scale thresholds proportionally based on container width
		// Base thresholds are for 400px width
		const thresholdBaseWidth = 400;
		const thresholdWidthScale = debouncedWidth / thresholdBaseWidth;

		// Adjust thresholds proportionally (but with reasonable bounds)
		const scaledTotalLong = Math.max(60, Math.min(100, 85 * thresholdWidthScale));
		const scaledTotalMedium = Math.max(45, Math.min(80, 65 * thresholdWidthScale));
		const scaledTotalShort = Math.max(12, Math.min(25, 16 * thresholdWidthScale));

		const scaledValueLong = Math.max(40, Math.min(70, 55 * thresholdWidthScale));
		const scaledValueMedium = Math.max(30, Math.min(60, 45 * thresholdWidthScale));
		const scaledValueShort = Math.max(8, Math.min(18, 12 * thresholdWidthScale));

		const scaledWordLong = Math.max(20, Math.min(35, 25 * thresholdWidthScale));
		const scaledWordMedium = Math.max(14, Math.min(25, 18 * thresholdWidthScale));
		const scaledWordShort = Math.max(8, Math.min(16, 12 * thresholdWidthScale));

		// Enhanced thresholds considering both total length and longest word
		let width;

		// Full width (4 quarters) - very long content or extremely long words
		if (
			totalLength > scaledTotalLong ||
			valueStr.length > scaledValueLong ||
			longestWord > scaledWordLong
		) {
			width = 4;
		}
		// Three-quarter width - long content or long words like "Meerwasserschwimmhalle"
		else if (
			totalLength > scaledTotalMedium ||
			valueStr.length > scaledValueMedium ||
			longestWord > scaledWordMedium
		) {
			width = 3;
		}
		// Half width - medium content or medium-long words
		else if (
			totalLength > scaledTotalShort ||
			valueStr.length > scaledValueShort ||
			longestWord > scaledWordShort
		) {
			width = 2;
		}
		// Quarter width - short content and short words
		else {
			width = 1;
		}

		return width;
	}

	function simpleLayout(facts) {
		const result = [];
		const used = new Set(); // Track which facts have been used
		let i = 0;

		while (i < facts.length) {
			// Skip already used facts
			while (i < facts.length && used.has(i)) {
				i++;
			}
			if (i >= facts.length) break;

			// Try to fill a complete row (4 columns)
			const row = [];
			let rowWidth = 0;

			// Fill the row as much as possible with sequential facts
			let j = i;
			while (j < facts.length && rowWidth < 4) {
				if (used.has(j)) {
					j++;
					continue;
				}

				const fact = facts[j];
				const minWidth = getMinWidthSpan(fact.label, fact.value, fact.key);

				if (rowWidth + minWidth <= 4) {
					// Item fits in current row
					row.push({ fact, minWidth, index: j });
					rowWidth += minWidth;
					used.add(j);
					j++;
				} else {
					// Item doesn't fit, break to try gap filling
					break;
				}
			}

			// Now try to fill remaining gaps with smaller facts from ahead
			let remainingSpace = 4 - rowWidth;
			if (remainingSpace > 0) {
				// Look for unused facts that could fill the remaining space
				for (let k = j; k < facts.length && remainingSpace > 0; k++) {
					if (used.has(k)) continue;

					const fact = facts[k];
					const minWidth = getMinWidthSpan(fact.label, fact.value, fact.key);

					if (minWidth <= remainingSpace) {
						// This fact fits in the remaining space
						row.push({ fact, minWidth, index: k });
						rowWidth += minWidth;
						remainingSpace -= minWidth;
						used.add(k);
					}
				}
			}

			// Only after gap-filling, try to expand existing items if there's still space
			remainingSpace = 4 - rowWidth;
			if (remainingSpace > 0) {
				if (row.length === 1) {
					// Single item in row - expand it to fill remaining space
					const item = row[0];
					const maxExpansion = Math.min(remainingSpace, 4 - item.minWidth);
					item.minWidth += maxExpansion;
				} else if (row.length > 1) {
					// Multiple items - try to expand the last added item first
					let expanded = false;
					for (let j = row.length - 1; j >= 0 && remainingSpace > 0 && !expanded; j--) {
						const item = row[j];
						const maxExpansion = Math.min(remainingSpace, 4 - item.minWidth);
						if (maxExpansion > 0) {
							item.minWidth += maxExpansion;
							remainingSpace -= maxExpansion;
							expanded = true;
						}
					}

					// If still space remaining, distribute among items
					if (remainingSpace > 0) {
						for (let j = 0; j < row.length && remainingSpace > 0; j++) {
							const item = row[j];
							if (item.minWidth < 4) {
								const expansion = Math.min(remainingSpace, 1);
								item.minWidth += expansion;
								remainingSpace -= expansion;
							}
						}
					}
				}
			}

			// Add the optimized row to results
			if (row.length > 0) {
				row.forEach((item) => {
					result.push({
						...item.fact,
						widthSpan: item.minWidth
					});
				});
			}

			// Move to next unused fact
			while (i < facts.length && used.has(i)) {
				i++;
			}
		}

		return result;
	}

	// Create optimized layout that fills gaps
	$: optimizedFacts =
		facts && layoutTrigger >= 0
			? (() => {
					const allFacts = [];

					// Collect all facts with their width spans
					Object.entries(facts).forEach(([key, value]) => {
						if (key !== 'other_facts' && value && value !== 'null' && PROPERTIES[key]) {
							const propDefinition = PROPERTIES[key];
							const label = formatLabel(key);
							const displayValue =
								propDefinition.type === 'array' && Array.isArray(value) ? value.join(' ') : value;
							allFacts.push({ key, label, value: displayValue, type: 'property' });
						}
					});

					if (facts?.other_facts && Array.isArray(facts.other_facts)) {
						facts.other_facts.forEach((fact, index) => {
							if (fact.label && fact.description && fact.description !== 'null') {
								allFacts.push({
									key: `other_${index}`,
									label: fact.label,
									value: fact.description,
									type: 'other'
								});
							}
						});
					}

					// Keep facts in original order for better layout
					// (sorting by width can cause layout issues)

					return simpleLayout(allFacts);
				})()
			: [];
</script>

<div bind:this={containerElement}>
	<div class="flex flex-auto">
		{#if !facts && factsLoading}
			<div class="m-6 flex justify-center">
				<Spinner size="6" />
			</div>
		{:else if facts}
			<div class="grid w-full auto-rows-fr grid-cols-4 gap-3">
				{#each optimizedFacts as fact}
					{#if fact.key === 'height'}
						<HeightFact
							value={fact.value}
							widthClass={`col-span-${fact.widthSpan}`}
							containerWidth={debouncedWidth}
						/>
					{:else if fact.key === 'architecture_style'}
						<ArchitectureStyleFact
							value={fact.value}
							widthClass={`col-span-${fact.widthSpan}`}
							containerWidth={debouncedWidth}
						/>
					{:else if fact.key === 'building_type'}
						<BuildingTypeFact
							value={fact.value}
							widthClass={`col-span-${fact.widthSpan}`}
							containerWidth={debouncedWidth}
						/>
					{:else if YEAR_PROPERTIES.includes(fact.key)}
						<YearFact
							value={fact.value}
							propertyKey={fact.key}
							widthClass={`col-span-${fact.widthSpan}`}
							containerWidth={debouncedWidth}
						/>
					{:else}
						<Fact label={fact.label} value={fact.value} widthClass={`col-span-${fact.widthSpan}`} />
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
