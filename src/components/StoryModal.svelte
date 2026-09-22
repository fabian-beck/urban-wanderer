<script>
	import Alert from 'flowbite-svelte/Alert.svelte';
	import Button from 'flowbite-svelte/Button.svelte';
	import CloseButton from 'flowbite-svelte/CloseButton.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';
	import Spinner from 'flowbite-svelte/Spinner.svelte';
	import { marked } from 'marked';
	import { speak, stopSpeech } from '../util/ai-speech.js';
	import { get } from 'svelte/store';
	import { markPlacesInText } from '../util/text.js';
	import { createLogger } from '../util/logger.js';
	import { CLASSES } from '../constants/place-classes.js';
	import {
		errorMessage,
		storyTexts,
		storyLoading,
		storyPartsShown,
		audioState,
		preferences,
		preloadingStory,
		continueStory,
		places,
		placeDetailsVisible,
		walk,
		walkActive
	} from '../stores.js';
	import { ArrowRightOutline, VolumeUpSolid, MessageDotsOutline } from 'flowbite-svelte-icons';

	const logger = createLogger('story.modal');

	// Function to make marked places clickable
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

	// Function to handle place clicks
	const openPlaceDetails = (placeTitle) => {
		placeDetailsVisible.set(placeTitle);
	};

	// Add event listener for place clicks after the content is rendered
	const handleStoryClick = (event) => {
		const target = event.target;
		if (target.tagName === 'STRONG' && target.dataset.placeTitle) {
			openPlaceDetails(target.dataset.placeTitle);
		}
	};

	// Handle keyboard events for accessibility
	const handleStoryKeydown = (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleStoryClick(event);
		}
	};

	export let visible = false;

	// Story generation and speech exclude each other: no speech while a part is generated,
	// no new part while speech is loading or playing
	$: audioBusy = $audioState !== 'paused';

	const playStory = (storyText) => {
		speak(storyText, get(preferences)).catch((error) => {
			logger.error('Story playback failed', error);
			errorMessage.set('Error playing audio: ' + error);
		});
	};

	// A story part that appears while the modal is open is shown once and, with autoplay on,
	// read aloud once; reopening the modal does not replay it
	$: if (visible && $storyTexts.length > $storyPartsShown) {
		const latestStoryText = $storyTexts[$storyTexts.length - 1];
		storyPartsShown.set($storyTexts.length);
		if ($preferences.audio) {
			playStory(latestStoryText);
		}
	}

	// Story parts shown while a walk is active count as read on the walk
	$: if (visible && $walkActive) {
		$storyTexts.forEach((storyText) => walk.recordStory(storyText));
	}

	const close = () => {
		visible = false;
		stopSpeech();
	};
</script>

<Modal classBody="p-0 overscroll-none" classDialog="" open={visible} on:close={close}>
	<!-- header with audio state -->
	<svelte:fragment slot="header">
		<div class="flex items-center">
			<div class="flex-none">
				<MessageDotsOutline size="lg" />
			</div>
			<div class="ml-1 flex-auto text-xl">Story</div>
			<div class="ml-4 flex-none text-sm">
				{#if $storyLoading}
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
						<CloseButton on:click={stopSpeech} class="flex-none" size="xs" />
					</Alert>
				{/if}
			</div>
		</div>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		<div class="p-4">
			{#if $storyTexts.length > 0}
				{#each $storyTexts as storyText, index (index)}
					<div
						on:click={handleStoryClick}
						on:keydown={handleStoryKeydown}
						role="button"
						tabindex="0"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html makeClickablePlaces(
							marked(markPlacesInText(storyText)).replaceAll('<p>', '<p class="mt-2">')
						)}
					</div>
					<div class="mb-2 flex justify-end">
						<Button
							on:click={() => playStory(storyText)}
							pill
							size="sm"
							outline
							class="mt-2 !p-2"
							disabled={audioBusy || $storyLoading}
						>
							<VolumeUpSolid size="sm" />
						</Button>
					</div>
					<hr class="my-4" />
				{/each}
				{#if !$storyLoading}
					<div class="mb-2 flex justify-end">
						<Button
							on:click={continueStory}
							pill
							size="xs"
							outline
							class="mt-2"
							disabled={$preloadingStory || audioBusy}
						>
							<ArrowRightOutline />
							{$preloadingStory ? 'Loading...' : 'Tell me more'}
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	</div></Modal
>
