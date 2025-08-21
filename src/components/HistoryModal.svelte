<script>
	import { Modal } from 'flowbite-svelte';
	import { marked } from 'marked';
	import { extractHistoricEvents } from '../util/ai-history.js';
	import {
		placesHere,
		placesSurrounding,
		coordinates,
		preferences,
		places,
		placeDetailsVisible
	} from '../stores.js';
	import { get } from 'svelte/store';
	import { markPlacesInText } from '../util/text.js';
	import { CLASSES } from '../constants/place-classes.js';
	import { errorMessage, events } from '../stores.js';
	import { CalendarMonthOutline } from 'flowbite-svelte-icons';
	import { Spinner, Alert } from 'flowbite-svelte';

	export let visible = false;

	let loading = false;

	// Function to make place names clickable with icons
	const makeClickablePlaces = (htmlContent) => {
		let result = htmlContent;
		const $places = get(places);
		// Sort places by length of title in descending order to handle longer names first
		const sortedPlaces = [...$places].sort((a, b) => b.title.length - a.title.length);

		sortedPlaces.forEach((place) => {
			let placeName = place.title.replace(/\s*\(.*?\)\s*/g, '');
			// Create a regex to find bold marked places
			let regEx = new RegExp(
				`<strong>${placeName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\w*</strong>`,
				'gi'
			);
			result = result.replace(regEx, (match) => {
				const placeText = match.replace(/<\/?strong>/g, '');
				const placeEmoji = place.cls && CLASSES[place.cls]?.emoji ? CLASSES[place.cls].emoji : '';
				return `<strong class="cursor-pointer text-primary-800 hover:text-primary-900" data-place-title="${place.title}">${placeEmoji}${placeEmoji ? ' ' : ''}${placeText}</strong>`;
			});
		});
		return result;
	};

	// Handle click events on place names
	const handlePlaceClick = (event) => {
		const target = event.target;
		if (target.dataset.placeTitle) {
			placeDetailsVisible.set(target.dataset.placeTitle);
		}
	};

	// Handle keyboard events for accessibility
	const handleKeydown = (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			const target = event.target;
			if (target.dataset.placeTitle) {
				event.preventDefault();
				placeDetailsVisible.set(target.dataset.placeTitle);
			}
		}
	};

	const updateHistory = async () => {
		loading = true;
		try {
			let eventsTmp = await extractHistoricEvents(
				get(placesHere),
				get(placesSurrounding),
				get(coordinates),
				get(preferences)
			);
			// sort events by year
			eventsTmp = eventsTmp.sort((a, b) => {
				if (a.year && b.year) {
					return a.year - b.year;
				}
				return 0;
			});
			// compute year differences to next event -> events.yearDiff
			eventsTmp = eventsTmp.map((event, index) => {
				if (event.year) {
					let yearDiff = 0;
					if (index < eventsTmp.length - 1) {
						yearDiff = eventsTmp[index + 1].year - event.year;
					} else {
						yearDiff = new Date().getFullYear() - event.year;
						if (yearDiff <= 0) {
							yearDiff = 0;
						}
					}
					if (yearDiff < 0) {
						return event;
					}
					return { ...event, yearDiff };
				}
				return event;
			});
			// set events
			events.set(eventsTmp);
		} catch (error) {
			console.error('Error extracting history', error);
			errorMessage.set('Error extracting history: ' + error);
		}
		loading = false;
	};

	$: if (visible && $events.length === 0) {
		updateHistory();
	}
</script>

<Modal
	classBody="p-0 overscroll-none"
	classDialog="z-[50]"
	open={visible}
	on:close={() => (visible = false)}
>
	<svelte:fragment slot="header">
		<div class="flex items-center">
			<div class="flex-none">
				<CalendarMonthOutline size="lg" />
			</div>
			<div class="ml-1 flex-auto text-xl">History</div>
			<div class="ml-4 flex-none text-sm">
				{#if loading}
					<Alert type="info" class="flex p-2 text-xs">
						<svelte:fragment slot="icon">
							<Spinner size="4" />
						</svelte:fragment>
						Extracting events...
					</Alert>
				{/if}
			</div>
		</div>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		<div class="p-4">
			{#if !loading}
				{#if $events.length === 0}
					<Alert color="primary"><i>No historic events found.</i></Alert>
				{/if}
				<div class="timeline">
					<ul>
						{#each $events as event}
							<li class="mt-2">
								<span class="text-sm font-bold text-primary-800">{event.date_string}</span>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<div
									on:click={handlePlaceClick}
									on:keydown={handleKeydown}
									role="button"
									tabindex="0"
								>
									{@html makeClickablePlaces(marked(markPlacesInText(event.text)))}
								</div>
								<div
									class="line mt-2"
									style="height: {Math.round(event.yearDiff / 8 + 0.25) * 4}px"
								></div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div></Modal
>

<style>
	.timeline {
		list-style-type: none;
		padding: 0;
	}

	:global(.timeline .line) {
		width: 4px;
		height: 20px;
		@apply bg-primary-500;
		margin-left: 4px;
	}
</style>
