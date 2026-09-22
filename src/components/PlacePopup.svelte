<script>
	import { onMount } from 'svelte';
	import Button from 'flowbite-svelte/Button.svelte';
	import CloseButton from 'flowbite-svelte/CloseButton.svelte';
	import { InfoCircleOutline } from 'flowbite-svelte-icons';
	import { loadPlaceImage, places } from '../stores.js';
	import { truncate } from '../util/walk.js';
	import { PLACE_POPUP_TEXT_LENGTH } from '../constants/core.js';
	import PlaceTitle from './PlaceTitle.svelte';
	import PlaceStars from './PlaceStars.svelte';

	// Compact preview of a place, positioned below a mention in a text without leaving it
	export let place;
	export let top = 0;
	export let onClose;
	export let onDetails;

	let element;

	$: currentPlace = $places?.find((candidate) => candidate.title === place.title) || place;
	$: summary = truncate(
		currentPlace.description || currentPlace.snippet || '',
		PLACE_POPUP_TEXT_LENGTH
	);
	$: if (!place.imageThumb) {
		loadPlaceImage(place, 'imageThumb', 100);
	}

	onMount(() => {
		element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});
</script>

<div
	bind:this={element}
	class="absolute left-2 right-2 z-10 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
	style="top: {top}px"
	role="dialog"
	aria-label={place.title}
>
	<div class="flex items-start space-x-3">
		<div class="h-16 w-16 shrink-0">
			{#if currentPlace.imageThumb}
				<img
					src={currentPlace.imageThumb}
					alt={currentPlace.title}
					class="!h-16 !w-16 !max-w-16 rounded-full border-2 object-cover object-center"
				/>
			{:else}
				<div class="h-16 w-16 rounded-full bg-gray-200"></div>
			{/if}
		</div>
		<div class="min-w-0 flex-auto text-left">
			<div class="text-md">
				<PlaceTitle place={currentPlace} />
			</div>
			<PlaceStars item={currentPlace} dense />
		</div>
		<CloseButton on:click={onClose} class="-mr-1 -mt-1 flex-none" size="xs" />
	</div>
	{#if summary}
		<p class="mt-2 text-sm text-gray-700">{summary}</p>
	{/if}
	<div class="mt-2 flex justify-end">
		<Button on:click={onDetails} pill size="xs" outline>
			<InfoCircleOutline size="sm" class="mr-1" />
			Details
		</Button>
	</div>
</div>
