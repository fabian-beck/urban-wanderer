<script>
	import Fact from './Fact.svelte';
	import HeightFact from './HeightFact.svelte';
	import ArchitectureStyleFact from './ArchitectureStyleFact.svelte';
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

	export let place;

	let facts = null;
	let factsLoading = false;

	// Define which properties represent years
	const YEAR_PROPERTIES = ['constructed', 'created', 'discovered', 'established'];

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

	function getMinWidthSpan(label, value, key = null) {
		// Height facts always need at least 3 quarters due to comparison images
		if (key === 'height') {
			return 3;
		}

		// Architecture style facts need more space for description
		if (key === 'architecture_style') {
			return 2;
		}

		// Year-based facts need more space if they have historical context
		if (YEAR_PROPERTIES.includes(key)) {
			return hasHistoricalContext(value) ? 2 : 1;
		}

		const labelStr = label?.toString() || '';
		const valueStr = value?.toString() || '';

		const totalLength = labelStr.length + valueStr.length;

		// More conservative thresholds for better layout
		let width;
		if (totalLength > 85 || valueStr.length > 55)
			width = 4; // full width - only for very long content
		else if (totalLength > 65 || valueStr.length > 45)
			width = 3; // three-quarter width - rare
		else if (totalLength > 16 || valueStr.length > 12)
			width = 2; // half width
		else width = 1; // quarter width

		return width;
	}

	function simpleLayout(facts) {
		const result = [];
		let i = 0;

		while (i < facts.length) {
			// Try to fill a complete row (4 columns)
			const row = [];
			let rowWidth = 0;

			// Fill the row as much as possible
			while (i < facts.length && rowWidth < 4) {
				const fact = facts[i];
				const minWidth = getMinWidthSpan(fact.label, fact.value, fact.key);

				if (rowWidth + minWidth <= 4) {
					// Item fits in current row
					row.push({ fact, minWidth, index: i });
					rowWidth += minWidth;
					i++;
				} else {
					// Item doesn't fit, break to process current row
					break;
				}
			}

			// Now optimize the row to fill gaps
			if (row.length > 0) {
				let remainingSpace = 4 - rowWidth;

				if (remainingSpace > 0) {
					// Distribute remaining space more intelligently
					if (row.length === 1) {
						// Single item in row - expand it to fill remaining space
						const item = row[0];
						const maxExpansion = Math.min(remainingSpace, 4 - item.minWidth);
						item.minWidth += maxExpansion;
					} else {
						// Multiple items - try to expand the largest item that can grow
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

						// If still space remaining, try to expand any item
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
				row.forEach((item) => {
					result.push({ ...item.fact, widthSpan: item.minWidth });
				});
			}
		}

		return result;
	}

	// Create optimized layout that fills gaps
	$: optimizedFacts = facts
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

<div>
	<div class="flex flex-auto">
		{#if !facts && factsLoading}
			<div class="m-6 flex justify-center">
				<Spinner size="6" />
			</div>
		{:else if facts}
			<div class="grid w-full auto-rows-fr grid-cols-4 gap-3">
				{#each optimizedFacts as fact}
					{#if fact.key === 'height'}
						<HeightFact value={fact.value} widthClass={`col-span-${fact.widthSpan}`} />
					{:else if fact.key === 'architecture_style'}
						<ArchitectureStyleFact value={fact.value} widthClass={`col-span-${fact.widthSpan}`} />
					{:else if YEAR_PROPERTIES.includes(fact.key)}
						<YearFact
							value={fact.value}
							propertyKey={fact.key}
							widthClass={`col-span-${fact.widthSpan}`}
						/>
					{:else}
						<Fact label={fact.label} value={fact.value} widthClass={`col-span-${fact.widthSpan}`} />
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
