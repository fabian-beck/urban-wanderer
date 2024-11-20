<script>
	import { Button, Spinner } from 'flowbite-svelte';
	import { extractHistoricEvents } from '../util/ai.js';
	import { markPlacesInText } from '../util/text.js';
	import { errorMessage } from '../stores.js';
	import { ArrowRightOutline, CalendarMonthOutline } from 'flowbite-svelte-icons';
	import { marked } from 'marked';

	let loading = false;

	let historyText = '';

	const updateHistory = async () => {
		loading = true;
		try {
			historyText = await extractHistoricEvents();
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
	{#if !historyText && !loading}
		<Button on:click={updateHistory} pill size="xs" outline
			><ArrowRightOutline />Extract events</Button
		>
	{/if}
</div>
{#if historyText}
	<div>
		{@html marked(markPlacesInText(historyText)).replaceAll('<li>', '<li class="mt-2">')}
	</div>
{/if}
{#if loading}
	<div class="m-6 flex justify-center">
		<Spinner />
	</div>
{/if}
<hr class="my-4" />
