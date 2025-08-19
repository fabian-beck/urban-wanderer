<script>
	import { Modal } from 'flowbite-svelte';
	import { marked } from 'marked';
	import { extractHistoricEvents } from '../util/ai-history.js';
	import { placesHere, placesSurrounding, coordinates, preferences } from '../stores.js';
	import { get } from 'svelte/store';
	import { markPlacesInText } from '../util/text.js';
	import { errorMessage, events } from '../stores.js';
	import { CalendarMonthOutline } from 'flowbite-svelte-icons';
	import { Spinner, Alert } from 'flowbite-svelte';

	export let visible = false;

	let loading = false;

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
	classDialog=""
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
								{@html marked(markPlacesInText(event.text))}
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
