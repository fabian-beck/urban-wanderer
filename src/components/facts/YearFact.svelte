<script>
	import { HISTORICAL_EVENTS, PROPERTY_TRANSLATIONS } from '../../constants.js';
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	export let value;
	export let propertyKey;
	export let widthClass = '';

	// Parse the year from the value
	$: year = parseInt(value);
	$: isValidYear = !isNaN(year) && year > -3000 && year < 2100;

	// Find the most relevant historical event for context
	$: historicalContext = isValidYear ? getHistoricalContext(year) : null;

	// Get localized label for the property
	$: label = getLocalizedLabel(propertyKey);

	function getLocalizedLabel(key) {
		const $language = get(preferences).lang;
		if (PROPERTY_TRANSLATIONS[key] && PROPERTY_TRANSLATIONS[key][$language]) {
			return PROPERTY_TRANSLATIONS[key][$language];
		}
		// Fallback: capitalize first letter and replace underscores
		return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
	}

	function getHistoricalContext(year) {
		// Find events that are contemporaneous or close to the year
		let bestMatch = null;
		let minDistance = Infinity;

		for (const event of HISTORICAL_EVENTS) {
			let distance;
			
			if (event.end) {
				// Event with duration
				if (year >= event.start && year <= event.end) {
					// Year falls within event period
					return {
						text: `during<br>${event.name}`,
						distance: 0
					};
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
				bestMatch = event;
			}
		}

		if (bestMatch && minDistance <= 10) {
			// Within 10 years - show relative timing
			if (minDistance === 0) {
				return { text: `same year as<br>${bestMatch.name}`, distance: minDistance };
			} else if (year < (bestMatch.end || bestMatch.start)) {
				const years = minDistance === 1 ? 'year' : 'years';
				return { text: `${minDistance} ${years} before<br>${bestMatch.name}`, distance: minDistance };
			} else {
				const years = minDistance === 1 ? 'year' : 'years';
				return { text: `${minDistance} ${years} after<br>${bestMatch.name}`, distance: minDistance };
			}
		}

		return null;
	}

</script>

<div
	class="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 px-2 py-1.5 text-center shadow-sm {widthClass}"
	style="background-color: rgb(249 250 251);"
>
	<div class="relative z-10 flex flex-col items-center">
		<span
			class="mb-0.5 text-xs font-medium leading-tight text-gray-600"
		>
			{label}
		</span>
		<div class="text-center">
			<div
				class="text-base font-semibold leading-tight text-gray-900"
			>
				{value}
			</div>
			{#if historicalContext}
				<div
					class="mt-1 text-xs leading-tight text-gray-600"
				>
					{@html historicalContext.text}
				</div>
			{/if}
		</div>
	</div>
</div>