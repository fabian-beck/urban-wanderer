<script>
	import { Button, Spinner, Alert } from 'flowbite-svelte';
	import { extractHistoricEvents } from '../util/ai.js';
	import { markPlacesInText } from '../util/text.js';
	import { errorMessage } from '../stores.js';
	import { ArrowRightOutline, CalendarMonthOutline } from 'flowbite-svelte-icons';
	import { marked } from 'marked';

	let loading = false;

	let events = null;

	const updateHistory = async () => {
		loading = true;
		try {
			events = await extractHistoricEvents();
			// sort events by year
			events = events.sort((a, b) => {
				if (a.year && b.year) {
					return a.year - b.year;
				}
				return 0;
			});
			// compute year differences to next event -> events.yearDiff
			events = events.map((event, index) => {
				if (event.year) {
					let yearDiff = 0;
					if (index < events.length - 1) {
						yearDiff = events[index + 1].year - event.year;
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
		} catch (error) {
			console.error('Error extracting history', error);
			errorMessage.set('Error extracting history: ' + error);
		}
		loading = false;
	};
</script>

<div class="mb-2 flex flex h-8 items-center text-primary-800">
	<CalendarMonthOutline />
	<h2 class="ml-2 flex-auto text-xl">Historic Events</h2>
	{#if !events && !loading}
		<Button on:click={updateHistory} pill size="xs" outline
			><ArrowRightOutline />Extract events</Button
		>
	{/if}
</div>
{#if events}
	{#if events.length === 0}
		<Alert color="primary"><i>No historic events found.</i></Alert>
	{/if}
	<div class="timeline">
		<ul>
			{#each events as event}
				<li class="mt-2">
					<span class="text-sm font-bold text-primary-800">{event.date_string}</span>
					{@html marked(markPlacesInText(event.text))}
					<!-- line height depends linearly on yearDiff-->
					<div
						class="line mt-2"
						style="height: {Math.round(event.yearDiff / 8 + 0.25) * 4}px"
					></div>
				</li>
			{/each}
		</ul>
	</div>
{/if}
{#if loading}
	<div class="m-6 flex justify-center">
		<Spinner />
	</div>
{/if}
<hr class="my-4" />

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
