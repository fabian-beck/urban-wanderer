<script>
	import { Button } from 'flowbite-svelte';
	import { ArrowRightOutline } from 'flowbite-svelte-icons';
	import PlaceFact from './PlaceFact.svelte';
	import { searchPlaceFacts } from '../util/ai.js';
	import { Spinner } from 'flowbite-svelte';
	import { CLASSES, PROPERTIES, PROPERTY_TRANSLATIONS } from '../constants.js';
	import { preferences } from '../stores.js';
	import { get } from 'svelte/store';

	export let place;

	let facts = null;
	let factsLoading = false;

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

		facts = await searchPlaceFacts(place, factsProperties);
		factsLoading = false;
	};

	function formatLabel(key) {
		const $language = get(preferences).lang;
		if (PROPERTY_TRANSLATIONS[key] && PROPERTY_TRANSLATIONS[key][$language]) {
			return PROPERTY_TRANSLATIONS[key][$language];
		}
		return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
	}

	function getMinWidthSpan(label, value) {
		const labelStr = label?.toString() || '';
		const valueStr = value?.toString() || '';

		const totalLength = labelStr.length + valueStr.length;

		// More conservative thresholds for better layout
		let width;
		if (totalLength > 55 || valueStr.length > 35)
			width = 4; // full width - only for very long content
		else if (totalLength > 45 || valueStr.length > 28)
			width = 3; // three-quarter width - rare
		else if (totalLength > 20 || valueStr.length > 12)
			width = 2; // half width
		else width = 1; // quarter width

		return width;
	}

	function simpleLayout(facts) {
		const result = [];
		let i = 0;
		let rowNum = 1;

		while (i < facts.length) {
			// Try to fill a complete row (4 columns)
			const row = [];
			let rowWidth = 0;

			// Fill the row as much as possible
			while (i < facts.length && rowWidth < 4) {
				const fact = facts[i];
				const minWidth = getMinWidthSpan(fact.label, fact.value);

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
			rowNum++;
		}

		return result;
	}

	// Create optimized layout that fills gaps
	$: optimizedFacts = facts
		? (() => {
				const allFacts = [];

				// Collect all facts with their width spans
				Object.entries(facts).forEach(([key, value]) => {
					if (key !== 'other_facts' && value && PROPERTIES[key]) {
						const propDefinition = PROPERTIES[key];
						const label = formatLabel(key);
						const displayValue =
							propDefinition.type === 'array' && Array.isArray(value) ? value.join(' ') : value;
						allFacts.push({ key, label, value: displayValue, type: 'property' });
					}
				});

				if (facts?.other_facts && Array.isArray(facts.other_facts)) {
					facts.other_facts.forEach((fact, index) => {
						if (fact.label && fact.description) {
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
		{#if !facts}
			{#if factsLoading}
				<div class="m-6 flex justify-center">
					<Spinner size="6" />
				</div>
			{:else}
				<Button on:click={loadFacts} pill size="xs" outline class="mt-2"
					><ArrowRightOutline />
					Search for facts
				</Button>
			{/if}
		{:else}
			<div class="grid w-full auto-rows-fr grid-cols-4 gap-3">
				{#each optimizedFacts as fact}
					<PlaceFact
						label={fact.label}
						value={fact.value}
						widthClass={`col-span-${fact.widthSpan}`}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
