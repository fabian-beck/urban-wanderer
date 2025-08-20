<script>
	import { Modal } from 'flowbite-svelte';
	import { marked } from 'marked';
	import { generateStory } from '../util/ai-story.js';
	import { textToSpeech } from '../util/ai-speech.js';
	import { get } from 'svelte/store';
	import { markPlacesInText } from '../util/text.js';
	import { CLASSES } from '../constants.js';
	import {
		errorMessage,
		storyTexts,
		storyResponseIds,
		storyLoading,
		audioState,
		preferences,
		preloadedStory,
		preloadingStory,
		preloadNextStoryPart,
		placesHere,
		placesNearby,
		placesSurrounding,
		coordinates,
		places,
		placeDetailsVisible
	} from '../stores.js';
	import { ArrowRightOutline, VolumeUpSolid, MessageDotsOutline } from 'flowbite-svelte-icons';
	import { Button, Spinner, Alert, CloseButton } from 'flowbite-svelte';

	let loading = false;

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
				return `<strong class="cursor-pointer text-primary-600 hover:text-primary-800" data-place-title="${place.title}">${placeEmoji}${placeEmoji ? ' ' : ''}${placeText}</strong>`;
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

	const updateStory = async () => {
		loading = true;
		audioState.set('paused');
		try {
			let nextStoryResult;
			// Use preloaded story if available
			if ($preloadedStory) {
				nextStoryResult = $preloadedStory;
				preloadedStory.set(null);
			} else {
				// Generate new story if no preloaded version
				const lastResponseId =
					$storyResponseIds.length > 0 ? $storyResponseIds[$storyResponseIds.length - 1] : null;
				nextStoryResult = await generateStory(
					$storyTexts,
					get(placesHere),
					get(placesNearby),
					get(placesSurrounding),
					get(coordinates),
					get(preferences),
					lastResponseId
				);
			}

			const newStoryTexts = [...$storyTexts, nextStoryResult.text];
			const newResponseIds = [...$storyResponseIds, nextStoryResult.responseId];
			$storyTexts = newStoryTexts;
			$storyResponseIds = newResponseIds;

			if (visible && $preferences.audio) {
				textToSpeech(nextStoryResult.text, audioState, get(preferences));
			}

			// Start preloading the next story part
			preloadNextStoryPart(newStoryTexts);
		} catch (error) {
			console.error('Error generating story', error);
			errorMessage.set('Error generating story: ' + error);
		}
		loading = false;
	};

	// Remove the redundant first story generation since it's handled by pregenerateStoryInBackground

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
				{#if loading || $storyLoading}
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
							on:click={() => textToSpeech(storyText, audioState, get(preferences))}
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
						<Button
							on:click={updateStory}
							pill
							size="xs"
							outline
							class="mt-2"
							disabled={$preloadingStory}
						>
							<ArrowRightOutline />
							{$preloadedStory ? 'Tell me more' : $preloadingStory ? 'Loading...' : 'Tell me more'}
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	</div></Modal
>
