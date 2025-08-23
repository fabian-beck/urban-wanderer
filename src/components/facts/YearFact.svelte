<script>
	import { HISTORICAL_EVENTS } from '../../constants/reference-data.js';
	import { PROPERTY_TRANSLATIONS, CLASSES } from '../../constants/place-classes.js';
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	export let value;
	export let propertyKey;
	export let widthClass = '';
	export let containerWidth = 400; // Available container width
	export let place = null; // Place object for label matching

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

	function getPlaceLabels(placeClass) {
		const classData = CLASSES[placeClass];
		return classData?.labels || [];
	}

	function getHistoricalContext(year) {
		// Filter events based on user preferences and place labels
		const $preferences = get(preferences);
		const userInterests = $preferences.interests || [];
		
		// Get place labels from place class
		const placeLabels = place?.cls ? getPlaceLabels(place.cls) : [];
		
		const relevantEvents = HISTORICAL_EVENTS.filter(event => {
			// If no interests are set, show all events
			if (userInterests.length === 0) return true;
			
			// If event has no labels, consider it generic (always relevant)
			if (!event.labels || event.labels.length === 0) return true;
			
			// Show event if any of its labels match user interests
			return event.labels.some(label => userInterests.includes(label));
		});

		// Find events that are contemporaneous or close to the year
		let bestMatch = null;
		let minDistance = Infinity;
		let bestScore = -1;

		for (const event of relevantEvents) {
			let distance;

			if (event.end) {
				// Event with duration
				if (year >= event.start && year <= event.end) {
					// Year falls within event period - check if this matches place labels
					const eventLabels = event.labels || [];
					const matchesPlace = eventLabels.some(label => placeLabels.includes(label));
					
					if (matchesPlace) {
						// Perfect match: within event period AND matches place type
						const eventName = getEventName(event);
						const $language = get(preferences).lang;
						const duringText = $language === 'de' ? 'während' : 'during';
						return {
							text: `${duringText}<br>${eventName}`,
							distance: 0
						};
					}
					
					// Store as potential match if no place-specific match found
					if (bestScore < 2) {
						const eventName = getEventName(event);
						const $language = get(preferences).lang;
						const duringText = $language === 'de' ? 'während' : 'during';
						bestMatch = event;
						bestScore = 2;
						minDistance = 0;
					}
					continue;
				} else if (year < event.start) {
					distance = event.start - year;
				} else {
					distance = year - event.end;
				}
			} else {
				// Single year event
				distance = Math.abs(year - event.start);
			}

			// Calculate score based on distance and place label matching
			let score = 0;
			const eventLabels = event.labels || [];
			const matchesPlace = eventLabels.some(label => placeLabels.includes(label));
			
			if (matchesPlace) {
				score = 3; // Highest priority for place-matching events
			} else {
				score = 1; // Lower priority for non-matching events
			}

			// Consider this event if it has a better score, or same score but closer distance
			if (score > bestScore || (score === bestScore && distance < minDistance)) {
				minDistance = distance;
				bestScore = score;
				bestMatch = event;
			}
		}

		if (bestMatch && minDistance <= 10) {
			const eventName = getEventName(bestMatch);
			const $language = get(preferences).lang;

			// Within 10 years - show relative timing
			if (minDistance === 0) {
				// Check if this is a duration event and year falls within it
				if (bestMatch.end && year >= bestMatch.start && year <= bestMatch.end) {
					const duringText = $language === 'de' ? 'während' : 'during';
					return { text: `${duringText}<br>${eventName}`, distance: minDistance };
				} else {
					const sameYearText = $language === 'de' ? 'gleiches Jahr wie' : 'same year as';
					return { text: `${sameYearText}<br>${eventName}`, distance: minDistance };
				}
			} else if (year < (bestMatch.end || bestMatch.start)) {
				const years =
					minDistance === 1
						? $language === 'de'
							? 'Jahr'
							: 'year'
						: $language === 'de'
							? 'Jahre'
							: 'years';
				const beforeText = $language === 'de' ? 'vor' : 'before';
				return {
					text: `${minDistance} ${years} ${beforeText}<br>${eventName}`,
					distance: minDistance
				};
			} else {
				const years =
					minDistance === 1
						? $language === 'de'
							? 'Jahr'
							: 'year'
						: $language === 'de'
							? 'Jahre'
							: 'years';
				const afterText = $language === 'de' ? 'nach' : 'after';
				return {
					text: `${minDistance} ${years} ${afterText}<br>${eventName}`,
					distance: minDistance
				};
			}
		}

		return null;
	}

	// Helper function to get event name in current language
	function getEventName(event) {
		const $language = get(preferences).lang;
		if (typeof event.name === 'object') {
			return event.name[$language] || event.name.en;
		}
		return event.name; // fallback for old format
	}

	// Determine if we have enough space to show historical context
	function shouldShowHistoricalContext(containerWidth, widthSpan) {
		const estimatedFactWidth = (containerWidth / 4) * widthSpan;
		// Need at least 120px to show historical context properly
		return estimatedFactWidth >= 120;
	}

	// Extract width span from widthClass
	function getWidthSpan(widthClass) {
		const match = widthClass.match(/col-span-(\d+)/);
		return match ? parseInt(match[1]) : 1;
	}

	$: showHistoricalContext = shouldShowHistoricalContext(containerWidth, getWidthSpan(widthClass));

	function getValueLength() {
		return value ? value.toString().length : 0;
	}
</script>

<div
	class="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 px-2 py-1.5 text-center shadow-sm {widthClass}"
	style="background-color: rgb(249 250 251);"
>
	<div class="relative z-10 flex flex-col items-center">
		<span class="mb-0.5 text-xs font-medium leading-tight text-gray-600">
			{label}
		</span>
		<div class="text-center">
			<div 
				class="font-semibold leading-tight text-gray-900"
				class:text-xl={getValueLength() <= 8}
				class:text-lg={getValueLength() > 8 && getValueLength() <= 15}
				class:text-base={getValueLength() > 15 && getValueLength() <= 25}
				class:text-sm={getValueLength() > 25 && getValueLength() <= 40}
				class:text-xs={getValueLength() > 40}
			>
				{value}
			</div>
			{#if historicalContext && showHistoricalContext}
				<div class="mt-1 text-xs leading-tight text-gray-600">
					{@html historicalContext.text}
				</div>
			{/if}
		</div>
	</div>
</div>
