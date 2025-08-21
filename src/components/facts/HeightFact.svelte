<script>
	import { FAMOUS_BUILDINGS } from '../../constants/reference-data.js';
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	export let value = '';
	export let widthClass = 'col-span-1';
	export let containerWidth = 400; // Available container width

	function parseHeight(heightStr) {
		if (!heightStr || typeof heightStr !== 'string') return null;

		// Remove extra whitespace and convert to lowercase
		const cleaned = heightStr.trim().toLowerCase();

		// Extract number and unit using regex - support both German (comma) and English (dot) notation
		const match = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(m|meters?|ft|feet|'|"|inches?)$/);
		if (!match) return null;

		// Replace comma with dot for parsing (German decimal notation)
		const numberStr = match[1].replace(',', '.');
		const number = parseFloat(numberStr);
		const unit = match[2];

		// Convert to meters
		if (unit.startsWith('ft') || unit === 'feet' || unit === "'") {
			return number * 0.3048; // feet to meters
		} else if (unit === '"' || unit.startsWith('inch')) {
			return number * 0.0254; // inches to meters
		} else {
			return number; // already in meters
		}
	}

	function findComparisons(heightInMeters) {
		if (!heightInMeters || heightInMeters <= 0) return null;

		// Find the closest smaller and larger buildings
		let smaller = null;
		let larger = null;

		for (let i = 0; i < FAMOUS_BUILDINGS.length; i++) {
			const building = FAMOUS_BUILDINGS[i];
			if (building.height < heightInMeters) {
				smaller = building;
			} else if (building.height > heightInMeters && !larger) {
				larger = building;
				break;
			}
		}

		return { smaller, larger };
	}

	function formatComparison(heightInMeters, comparisons) {
		if (!comparisons) return { mainValue: value, smaller: null, larger: null };

		const { smaller, larger } = comparisons;

		// Format height according to language preference
		const roundedHeight = Math.round(heightInMeters);
		const mainValue = `${roundedHeight}m`;

		return { mainValue, smaller, larger };
	}

	function getHeightLabel() {
		const $language = get(preferences).lang;
		return $language === 'de' ? 'Höhe' : 'Height';
	}

	// Determine if we have enough space to show comparisons
	function shouldShowComparisons(containerWidth, widthSpan) {
		const estimatedFactWidth = (containerWidth / 4) * widthSpan;
		// Need at least 180px to show comparisons properly
		return estimatedFactWidth >= 180;
	}

	// Extract width span from widthClass
	function getWidthSpan(widthClass) {
		const match = widthClass.match(/col-span-(\d+)/);
		return match ? parseInt(match[1]) : 1;
	}

	$: heightInMeters = parseHeight(value);
	$: comparisons = findComparisons(heightInMeters);
	$: formattedResult = heightInMeters
		? formatComparison(heightInMeters, comparisons)
		: { mainValue: value, smaller: null, larger: null };
	$: showComparisons = shouldShowComparisons(containerWidth, getWidthSpan(widthClass));
</script>

<div
	class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center shadow-sm {widthClass}"
>
	<div class="text-center">
		{#if showComparisons && (formattedResult.smaller || formattedResult.larger)}
			<div class="flex items-end justify-center gap-2 text-sm">
				{#if formattedResult.smaller}
					<div class="flex flex-col items-center">
						<div class="mb-0.5 text-xs leading-none text-gray-500" style="font-size: 0.55rem;">
							{formattedResult.smaller.shortName}
						</div>
						<img
							src="/buildings/{formattedResult.smaller.image}"
							alt={formattedResult.smaller.name}
							class="h-12 w-8 object-contain"
							title="{formattedResult.smaller.name} ({formattedResult.smaller.height}m)"
						/>
						<div class="text-xs leading-none text-gray-500" style="font-size: 0.65rem;">
							{formattedResult.smaller.height}m
						</div>
					</div>
					<span class="mb-1 text-gray-600">&lt;</span>
				{/if}

				<div class="mb-1 flex flex-col items-center px-1">
					<span class="mb-0.5 text-xs font-medium leading-none text-gray-600"
						>{getHeightLabel()}</span
					>
					<div class="text-base font-semibold leading-tight text-gray-900">
						{formattedResult.mainValue}
					</div>
				</div>

				{#if formattedResult.larger}
					<span class="mb-1 text-gray-600">&lt;</span>
					<div class="flex flex-col items-center">
						<div class="mb-0.5 text-xs leading-none text-gray-500" style="font-size: 0.55rem;">
							{formattedResult.larger.shortName}
						</div>
						<img
							src="/buildings/{formattedResult.larger.image}"
							alt={formattedResult.larger.name}
							class="h-12 w-8 object-contain"
							title="{formattedResult.larger.name} ({formattedResult.larger.height}m)"
						/>
						<div class="text-xs leading-none text-gray-500" style="font-size: 0.65rem;">
							{formattedResult.larger.height}m
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center">
				<span class="mb-0.5 text-xs font-medium leading-none text-gray-600">{getHeightLabel()}</span
				>
				<div class="text-base font-semibold leading-tight text-gray-900">
					{formattedResult.mainValue}
				</div>
			</div>
		{/if}
	</div>
</div>
