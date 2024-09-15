<script>
	import { Button, Spinner } from 'flowbite-svelte';
	import { generateStory } from './util/ai.js';
	import { errorMessage, storyTexts } from './stores.js';
	import { ArrowRightOutline } from 'flowbite-svelte-icons';

	let loading = false;

	const updateStory = async () => {
		loading = true;
		try {
			// $storyText = await generateStory();
			const nextStoryText = await generateStory($storyTexts);
			$storyTexts = [...$storyTexts, nextStoryText];
		} catch (error) {
			console.error('Error generating story', error);
			errorMessage.set('Error generating story: ' + error);
		}
		loading = false;
	};
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Story</h2>
	{#if $storyTexts.length === 0 && !loading}
		<Button on:click={updateStory} pill size="xs" outline><ArrowRightOutline />Tell me</Button>
	{/if}
</div>
{#if $storyTexts.length > 0}
	{#each $storyTexts as storyText}
		<div>
			{@html storyText.replaceAll('<p>', '<p class="mt-2">')}
		</div>
		<hr class="my-4" />
	{/each}
	{#if !loading}
		<div class="mb-2 flex justify-end">
			<Button on:click={updateStory} pill size="xs" outline class="mt-2"
				><ArrowRightOutline />Tell me more</Button
			>
		</div>
	{/if}
{/if}
{#if loading}
	<div class="m-6 flex justify-center">
		<Spinner />
	</div>
{/if}
