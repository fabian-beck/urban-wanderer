<script>
	import Alert from 'flowbite-svelte/Alert.svelte';
	import Button from 'flowbite-svelte/Button.svelte';
	import CloseButton from 'flowbite-svelte/CloseButton.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';
	import Spinner from 'flowbite-svelte/Spinner.svelte';
	import { speak, stopSpeech } from '../util/ai-speech.js';
	import { get } from 'svelte/store';
	import { createLogger } from '../util/logger.js';
	import { PLACE_MENTION_HREF_PREFIX } from '../constants/core.js';
	import PlaceMentions from './PlaceMentions.svelte';
	import PlacePopup from './PlacePopup.svelte';
	import {
		errorMessage,
		storyTexts,
		storyLoading,
		storyPartsShown,
		audioState,
		preferences,
		preloadingStory,
		continueStory,
		placeDetailsVisible,
		walk,
		walkActive
	} from '../stores.js';
	import { ArrowRightOutline, VolumeUpSolid, MessageDotsOutline } from 'flowbite-svelte-icons';

	const logger = createLogger('story.modal');

	export let visible = false;

	// A tapped place mention opens a preview popup below the mention instead of the place
	// details, so reading and audio playback continue uninterrupted
	let storyContainer;
	let popupContainer;
	let popup = null;

	const showPlacePopup = (place, link) => {
		const top =
			link.getBoundingClientRect().bottom - storyContainer.getBoundingClientRect().top + 4;
		popup = { place, top };
	};

	const closePlacePopup = () => {
		popup = null;
	};

	const openPlaceDetails = () => {
		placeDetailsVisible.set(popup.place.title);
		closePlacePopup();
	};

	const handleWindowPointerDown = (event) => {
		if (
			popup &&
			!popupContainer?.contains(event.target) &&
			!event.target.closest?.(`a[href^="${PLACE_MENTION_HREF_PREFIX}"]`)
		) {
			closePlacePopup();
		}
	};

	$: if (!visible || $storyTexts.length === 0) {
		popup = null;
	}

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

<svelte:window on:pointerdown={handleWindowPointerDown} />

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
		<div class="relative p-4" bind:this={storyContainer}>
			{#if popup}
				<div bind:this={popupContainer}>
					<PlacePopup
						place={popup.place}
						top={popup.top}
						onClose={closePlacePopup}
						onDetails={openPlaceDetails}
					/>
				</div>
			{/if}
			{#if $storyTexts.length > 0}
				{#each $storyTexts as storyText, index (index)}
					<PlaceMentions text={storyText} onSelect={showPlacePopup} paragraphClass="mt-2" />
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
