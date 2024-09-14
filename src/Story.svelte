<script>
	import { Button, Spinner, GradientButton } from 'flowbite-svelte';
	import { generateStory } from './util/ai.js';
	import { errorMessage, storyText } from './stores.js';
	import { ArrowRightOutline } from 'flowbite-svelte-icons';

	let loading = false;

	const updateStory = async () => {
		loading = true;
		try {
			$storyText = await generateStory();
		} catch (error) {
			console.error('Error generating story', error);
			errorMessage.set('Error generating story: ' + error);
		}
		loading = false;
	};
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Story</h2>
	<Button on:click={updateStory} pill size="xs" outline><ArrowRightOutline />Tell me</Button>
</div>
{#if loading}
	<div class="m-6 flex justify-center">
		<Spinner />
	</div>
{:else if $storyText}
	<div>
		{$storyText}
	</div>
{/if}
