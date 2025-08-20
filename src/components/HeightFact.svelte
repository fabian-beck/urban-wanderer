<script>
	import { FAMOUS_BUILDINGS } from '../constants.js';

	export let value = '';
	export let widthClass = 'col-span-1';

	function parseHeight(heightStr) {
		if (!heightStr || typeof heightStr !== 'string') return null;

		// Remove extra whitespace and convert to lowercase
		const cleaned = heightStr.trim().toLowerCase();

		// Extract number and unit using regex
		const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(m|meters?|ft|feet|'|"|inches?)$/);
		if (!match) return null;

		const number = parseFloat(match[1]);
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
		if (!comparisons) return { mainValue: value, comparison: null };

		const { smaller, larger } = comparisons;
		const mainValue = `${Math.round(heightInMeters)}m`;

		const parts = [];
		if (smaller) {
			parts.push(`> ${smaller.name} (${smaller.height}m)`);
		}
		if (larger) {
			parts.push(`< ${larger.name} (${larger.height}m)`);
		}

		const comparison = parts.length > 0 ? `(${parts.join('; ')})` : null;

		return { mainValue, comparison };
	}

	$: heightInMeters = parseHeight(value);
	$: comparisons = findComparisons(heightInMeters);
	$: formattedResult = heightInMeters ? formatComparison(heightInMeters, comparisons) : { mainValue: value, comparison: null };
</script>

<div
	class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center shadow-sm {widthClass}"
>
	<span class="mb-0.5 text-xs font-medium leading-tight text-gray-600">Height</span>
	<div class="text-center">
		<div class="font-semibold leading-tight text-gray-900 text-base">
			{formattedResult.mainValue}
		</div>
		{#if formattedResult.comparison}
			<div class="mt-0.5 text-xs leading-tight text-gray-600">
				{formattedResult.comparison}
			</div>
		{/if}
	</div>
</div>
