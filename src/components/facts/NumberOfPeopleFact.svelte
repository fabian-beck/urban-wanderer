<script>
	import { preferences } from '../../stores.js';
	import { get } from 'svelte/store';

	export let value = '';
	export let propertyKey = '';
	export let widthClass = 'col-span-1';
	export let containerWidth = 400;
	export let placeTitle = '';

	function parseNumber(numberStr) {
		if (!numberStr) return null;

		// Convert to string if it's a number
		const str = numberStr.toString().trim().toLowerCase();

		// Try to match number with optional unit
		const match = str.match(/^(\d+(?:[.,]\d+)?)\s*(k|thousand|million|m|billion|b)?$/);
		if (!match) return null;

		const numberStr_clean = match[1].replace(',', '.');
		const number = parseFloat(numberStr_clean);
		const unit = match[2];

		if (!unit) return Math.round(number);

		switch (unit) {
			case 'k':
			case 'thousand':
				return Math.round(number * 1000);
			case 'm':
			case 'million':
				return Math.round(number * 1000000);
			case 'b':
			case 'billion':
				return Math.round(number * 1000000000);
			default:
				return Math.round(number);
		}
	}

	function calculateIsotype(count) {
		if (!count || count <= 0) return { icons: 0, scale: 1, explanation: '' };

		let scale;
		let icons;

		// Find the appropriate scale so we get max 20 icons
		if (count <= 20) {
			scale = 1;
			icons = count;
		} else if (count <= 200) {
			scale = 10;
			icons = Math.round(count / 10);
		} else if (count <= 2000) {
			scale = 100;
			icons = Math.round(count / 100);
		} else if (count <= 20000) {
			scale = 1000;
			icons = Math.round(count / 1000);
		} else if (count <= 200000) {
			scale = 10000;
			icons = Math.round(count / 10000);
		} else if (count <= 2000000) {
			scale = 100000;
			icons = Math.round(count / 100000);
		} else if (count <= 20000000) {
			scale = 1000000;
			icons = Math.round(count / 1000000);
		} else {
			scale = 10000000;
			icons = Math.round(count / 10000000);
		}

		return { icons, scale, explanation: getExplanation(scale) };
	}

	function getExplanation(scale) {
		const $language = get(preferences).lang;
		if (scale === 1) return '';

		if ($language === 'de') {
			if (scale >= 1000000) return `🧑 = ${(scale / 1000000).toLocaleString('de')}M Menschen`;
			if (scale >= 1000) return `🧑 = ${(scale / 1000).toLocaleString('de')}k Menschen`;
			return `🧑 = ${scale.toLocaleString('de')} Menschen`;
		} else {
			if (scale >= 1000000) return `🧑 = ${(scale / 1000000).toLocaleString('en')}M people`;
			if (scale >= 1000) return `🧑 = ${(scale / 1000).toLocaleString('en')}k people`;
			return `🧑 = ${scale.toLocaleString('en')} people`;
		}
	}

	function getLabel(propertyKey) {
		const $language = get(preferences).lang;
		const labels = {
			population: { en: 'Population', de: 'Einwohner' },
			student_count: { en: 'Students', de: 'Studenten' },
			employee_count: { en: 'Employees', de: 'Mitarbeiter' },
			capacity: { en: 'Capacity', de: 'Kapazität' },
			visit_count: { en: 'Visitors', de: 'Besucher' },
			yearly_passenger_count: { en: 'Passengers', de: 'Passagiere' },
			bed_count: { en: 'Beds', de: 'Betten' }
		};

		return labels[propertyKey]?.[$language] || labels[propertyKey]?.en || 'People';
	}

	function formatNumber(count) {
		const $language = get(preferences).lang;
		const locale = $language === 'de' ? 'de' : 'en';

		if (count >= 1000000) {
			return (count / 1000000).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'M';
		} else if (count >= 1000) {
			return (count / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'k';
		}
		return count.toLocaleString(locale);
	}

	function shouldShowIcons(containerWidth, widthSpan) {
		const estimatedFactWidth = (containerWidth / 4) * widthSpan;
		return estimatedFactWidth >= 80; // Lowered threshold for testing
	}

	function getWidthSpan(widthClass) {
		const match = widthClass.match(/col-span-(\d+)/);
		return match ? parseInt(match[1]) : 1;
	}

	function getIconSize(scale) {
		// Scale font size based on order of magnitude (further increased sizes)
		if (scale === 1) return 'text-lg'; // 1 person per icon
		if (scale <= 100) return 'text-xl'; // 10-100 people per icon
		if (scale <= 10000) return 'text-2xl'; // 1k-10k people per icon
		if (scale <= 1000000) return 'text-3xl'; // 100k-1M people per icon
		return 'text-4xl'; // 1M+ people per icon
	}

	function seededRandom(seed) {
		// Simple Linear Congruential Generator for seeded random
		let x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	}

	function getPeopleIcon(index) {
		// Randomize diverse standing person icons using seeded random based on place, property, and position
		const icons = ['🧍', '🧍‍♀️', '🧍‍♂️', '🧍🏻', '🧍🏻‍♀️', '🧍🏻‍♂️', '🧍🏽', '🧍🏽‍♀️', '🧍🏽‍♂️', '🧍🏿', '🧍🏿‍♀️', '🧍🏿‍♂️'];
		
		// Create a unique seed based on place title, property key, and icon index
		const titleHash = placeTitle ? placeTitle.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
		const propertyHash = propertyKey ? propertyKey.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
		const combinedSeed = titleHash * 1000 + propertyHash * 100 + index;
		
		const random = seededRandom(combinedSeed);
		return icons[Math.floor(random * icons.length)];
	}

	$: count = parseNumber(value);
	$: isotype = calculateIsotype(count);
	$: widthSpan = getWidthSpan(widthClass);
	$: showIcons = shouldShowIcons(containerWidth, widthSpan);
	$: formattedNumber = count ? formatNumber(count) : value;

	function getValueLength() {
		return formattedNumber ? formattedNumber.toString().length : 0;
	}
</script>

<div
	class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center shadow-sm {widthClass}"
>
	<div class="text-center">
		<span class="mb-0.5 text-xs font-medium leading-none text-gray-600"
			>{getLabel(propertyKey)}</span
		>
		<div class="flex flex-col items-center">
			<div 
				class="mb-1 font-semibold leading-tight text-gray-900"
				class:text-xl={getValueLength() <= 8}
				class:text-lg={getValueLength() > 8 && getValueLength() <= 15}
				class:text-base={getValueLength() > 15 && getValueLength() <= 25}
				class:text-sm={getValueLength() > 25 && getValueLength() <= 40}
				class:text-xs={getValueLength() > 40}
			>
				{formattedNumber}
			</div>
			{#if showIcons && isotype.icons > 0}
				<div class="flex max-w-full flex-wrap justify-center">
					{#each Array(isotype.icons) as _, i}
						<span 
							class={getIconSize(isotype.scale)} 
							style="margin-left: {i > 0 ? (i % 5 === 0 ? '-0.6em' : '-0.9em') : '0'};"
						>{getPeopleIcon(i)}</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
