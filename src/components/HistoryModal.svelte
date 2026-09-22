<script>
	import Alert from 'flowbite-svelte/Alert.svelte';
	import Button from 'flowbite-svelte/Button.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';
	import Spinner from 'flowbite-svelte/Spinner.svelte';
	import {
		placesHere,
		placesNearby,
		placesSurrounding,
		coordinates,
		preferences,
		placeDetailsVisible,
		errorMessage,
		events,
		eventsLoadedKey,
		eventsLoading,
		eventsStatus,
		loadHistoricEvents
	} from '../stores.js';
	import PlaceMentions from './PlaceMentions.svelte';
	import { getHistoricEventKey } from '../util/ai-history.js';
	import { CalendarMonthOutline } from 'flowbite-svelte-icons';

	export let visible = false;

	let currentHistoryKey;

	const openPlaceDetails = (place) => placeDetailsVisible.set(place.title);

	$: currentHistoryKey = getHistoricEventKey(
		$coordinates,
		$preferences,
		$placesHere,
		$placesNearby,
		$placesSurrounding
	);

	$: if (
		visible &&
		currentHistoryKey &&
		!$eventsLoading &&
		$eventsLoadedKey !== currentHistoryKey
	) {
		loadHistoricEvents();
	}
</script>

<Modal
	classBody="p-0 overscroll-none"
	classDialog="z-[50]"
	open={visible}
	on:close={() => (visible = false)}
>
	<svelte:fragment slot="header">
		<div class="flex items-center">
			<div class="flex-none">
				<CalendarMonthOutline size="lg" />
			</div>
			<div class="ml-1 flex-auto text-xl">History</div>
			<div class="ml-4 flex-none text-sm">
				{#if $eventsLoading}
					<Alert type="info" class="flex p-2 text-xs">
						<svelte:fragment slot="icon">
							<Spinner size="4" />
						</svelte:fragment>
						Extracting events...
					</Alert>
				{/if}
			</div>
		</div>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		<div class="p-4">
			{#if !$eventsLoading}
				{#if $eventsStatus === 'empty'}
					<Alert color="primary">
						<i>No specific historic events found for this location yet.</i>
						<span class="mt-1 block text-sm">
							Try increasing the search radius or moving to a place with richer article coverage.
						</span>
					</Alert>
				{:else if $eventsStatus === 'error'}
					<Alert color="red">
						<i>History could not be loaded.</i>
						<div class="mt-2">
							<Button
								size="xs"
								outline
								on:click={() => {
									errorMessage.set(null);
									loadHistoricEvents();
								}}>Retry</Button
							>
						</div>
					</Alert>
				{/if}
				<div class="timeline">
					<ul>
						{#each $events as event, index (index)}
							<li class="mt-2">
								<span class="text-sm font-bold text-primary-800">{event.date_string}</span>
								<PlaceMentions text={event.text} onSelect={openPlaceDetails} />
								<div
									class="line mt-2"
									style="height: {Math.round(event.yearDiff / 8 + 0.25) * 4}px"
								></div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div></Modal
>

<style>
	.timeline {
		list-style-type: none;
		padding: 0;
	}

	:global(.timeline .line) {
		width: 4px;
		height: 20px;
		@apply bg-primary-500;
		margin-left: 4px;
	}
</style>
