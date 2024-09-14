<script>
	import { Button, Spinner } from 'flowbite-svelte';
	import { generateStory } from './util/ai.js';
	import { errorMessage } from './stores.js';
	import { RefreshOutline } from 'flowbite-svelte-icons';

	let storyText = '';

	let loading = false;

	const updateStory = async () => {
		loading = true;
		try {
			storyText = await generateStory();
		} catch (error) {
			console.error('Error generating story', error);
			errorMessage.set('Error generating story: ' + error);
		}
		loading = false;
	};
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Story</h2>
	<Button on:click={updateStory} pill class="!p-2">
		<RefreshOutline /></Button
	>
</div>
{#if loading}
	<div class="m-6 flex justify-center">
		<Spinner />
	</div>
{:else}
	<div>
		{storyText}
	</div>
{/if}
