<script>
	import { Modal } from 'flowbite-svelte';
	import { marked } from 'marked';
	import { generateStory, textToSpeech } from '../util/ai.js';
	import { markPlacesInText } from '../util/text.js';
	import { errorMessage, storyTexts, audioState, preferences } from '../stores.js';
	import { ArrowRightOutline, VolumeUpSolid, MessageDotsOutline } from 'flowbite-svelte-icons';
	import { Button, Spinner, Alert, CloseButton } from 'flowbite-svelte';

	let loading = false;

	const updateStory = async () => {
		loading = true;
		audioState.set('paused');
		try {
			const nextStoryText = await generateStory($storyTexts);
			$storyTexts = [...$storyTexts, nextStoryText];
			if (visible && $preferences.audio) {
				textToSpeech(nextStoryText);
			}
		} catch (error) {
			console.error('Error generating story', error);
			errorMessage.set('Error generating story: ' + error);
		}
		loading = false;
	};

	$: if (visible && $storyTexts.length === 0) {
		updateStory();
	}

	export let visible = false;
</script>

<Modal
	classBody="p-0 overscroll-none"
	classDialog=""
	open={visible}
	on:close={() => {
		visible = false;
		audioState.set('paused');
	}}
>
	<!-- header with audio state -->
	<svelte:fragment slot="header">
		<div class="flex items-center">
			<div class="flex-none">
				<MessageDotsOutline size="lg" />
			</div>
			<div class="ml-1 flex-auto text-xl">Story</div>
			<div class="ml-4 flex-none text-sm">
				{#if loading}
					<Alert type="info" class="flex p-2 text-xs">
						<svelte:fragment slot="icon">
							<Spinner size="4" />
						</svelte:fragment>
						Generating story...
					</Alert>
				{/if}
				{#if $audioState !== 'paused'}
					<Alert type="info" class="flex p-2 text-xs">
						<svelte:fragment slot="icon">
							{#if $audioState === 'loading'}
								<Spinner size="4" />
							{/if}
							{#if $audioState === 'playing'}
								<VolumeUpSolid size="xs" />
							{/if}
						</svelte:fragment>
						Audio {$audioState}
						<CloseButton on:click={() => audioState.set('paused')} class="flex-none" size="xs" />
					</Alert>
				{/if}
			</div>
		</div>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		<div class="p-4">
			{#if $storyTexts.length > 0}
				{#each $storyTexts as storyText}
					<div>
						{@html marked(markPlacesInText(storyText)).replaceAll('<p>', '<p class="mt-2">')}
					</div>
					<div class="mb-2 flex justify-end">
						<Button
							on:click={() => textToSpeech(storyText)}
							pill
							size="sm"
							outline
							class="mt-2 !p-2"
							disabled={$audioState === 'loading' || $audioState === 'playing' || loading}
						>
							<VolumeUpSolid size="sm" />
						</Button>
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
		</div>
	</div></Modal
>
