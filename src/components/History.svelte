<script>
	import { Button, Spinner } from 'flowbite-svelte';
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
			const historyText = await extractHistoricEvents();
			events = [];
			// split event text -> events.text
			// extract date from events.text -> events.date
			events = historyText.split('\n').map((line) => {
				// remove trailing markdown list characters
				line = line.replace(/^- /, '');
				// parse year from date if possible, ignore markdown (Format: "**2021...")
				let year = line.match(/(\d{4})/);
				year = year ? year[0] : '';
				if (year) {
					return { date: year, text: line };
				}
				return { date: '', text: line };
			});
			// filter empty events
			events = events.filter((event) => event.text.trim() !== '');
			// compute year differences to next event -> events.yearDiff
			events = events.map((event, index) => {
				if (event.date) {
					let yearDiff = 0;
					if (index < events.length - 1) {
						yearDiff = events[index + 1].date - event.date;
					} else {
						yearDiff = new Date().getFullYear() - event.date;
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
			console.log(events);
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
	<div class="timeline">
		<ul>
			{#each events as event}
				<li class="mt-2">
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
	}
</style>
