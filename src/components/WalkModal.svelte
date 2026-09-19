<script>
	import { onDestroy, onMount } from 'svelte';
	import Alert from 'flowbite-svelte/Alert.svelte';
	import Button from 'flowbite-svelte/Button.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';
	import Spinner from 'flowbite-svelte/Spinner.svelte';
	import { marked } from 'marked';
	import { TrackingOutline, CheckCircleSolid, MessageDotsOutline } from 'flowbite-svelte-icons';
	import {
		walk,
		walkActive,
		preferences,
		errorMessage,
		beginWalk,
		startNewWalk
	} from '../stores.js';
	import {
		formatWalkDistance,
		formatWalkDuration,
		formatWalkTime,
		getWalkRecapKey,
		getWalkStats
	} from '../util/walk.js';
	import { generateWalkRecap } from '../util/ai-story.js';
	import { CLASSES } from '../constants/place-classes.js';
	import { createLogger } from '../util/logger.js';

	export let visible = false;

	const logger = createLogger('walk.modal');
	let recapLoading = false;
	let confirmNewWalk = false;
	let tick = 0;
	let tickInterval;

	onMount(() => {
		tickInterval = setInterval(() => (tick += 1), 30000);
	});
	onDestroy(() => clearInterval(tickInterval));

	$: if (!visible) {
		confirmNewWalk = false;
	}
	$: stats = $walkActive && tick >= 0 ? getWalkStats($walk) : null;
	$: recapCurrent = $walk?.recap && $walk.recap.key === getWalkRecapKey($walk);
	$: stopPlaces = ($walk?.stops || []).map((stop, index) =>
		stop.placeIdentities
			.map((identity) => $walk.visitedPlaces.find((place) => place.identity === identity))
			.filter(Boolean)
			.map((place) => ({ ...place, revisit: place.firstStopIndex < index }))
	);
	$: stopStories = ($walk?.stops || []).map((stop, index) =>
		$walk.stories.filter((story) => story.stopIndex === index)
	);

	const getStopLabel = (stop) =>
		[stop.road, stop.suburb, stop.town || stop.village].filter(Boolean).join(', ') ||
		stop.address ||
		'Unknown position';

	const loadRecap = async () => {
		if (recapLoading || !$walk) {
			return;
		}
		recapLoading = true;
		try {
			walk.setRecap(await generateWalkRecap($walk, $preferences));
		} catch (error) {
			logger.error('Walk recap generation failed', error);
			errorMessage.set('Error generating walk recap: ' + error);
		} finally {
			recapLoading = false;
		}
	};

	const handleStartWalk = () => {
		visible = false;
		beginWalk();
	};

	const handleNewWalk = () => {
		visible = false;
		startNewWalk();
	};
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
				<TrackingOutline size="lg" />
			</div>
			<div class="ml-1 flex-auto text-xl">Walk</div>
		</div>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		<div class="p-4">
			{#if !$walkActive}
				<Alert color="primary">
					<i>
						No walk in progress. Start a walk to explore the places around you; your guide remembers
						the route, avoids repeating itself, and marks places you have already seen.
					</i>
				</Alert>
				<div class="mt-4 flex justify-end">
					<Button on:click={handleStartWalk}>
						<TrackingOutline class="mr-2" />Start walk
					</Button>
				</div>
			{:else}
				<div class="grid grid-cols-4 gap-2 text-center">
					<div class="rounded-lg bg-gray-100 p-2">
						<div class="text-lg font-bold text-primary-800">
							{formatWalkDuration(stats.durationMs)}
						</div>
						<div class="text-xs text-gray-500">since {formatWalkTime($walk.startedAt)}</div>
					</div>
					<div class="rounded-lg bg-gray-100 p-2">
						<div class="text-lg font-bold text-primary-800">
							{formatWalkDistance(stats.distanceMeters)}
						</div>
						<div class="text-xs text-gray-500">distance</div>
					</div>
					<div class="rounded-lg bg-gray-100 p-2">
						<div class="text-lg font-bold text-primary-800">{stats.stops}</div>
						<div class="text-xs text-gray-500">{stats.stops === 1 ? 'stop' : 'stops'}</div>
					</div>
					<div class="rounded-lg bg-gray-100 p-2">
						<div class="text-lg font-bold text-primary-800">{stats.visitedPlaces}</div>
						<div class="text-xs text-gray-500">
							{stats.visitedPlaces === 1 ? 'place' : 'places'}
						</div>
					</div>
				</div>

				{#if $walk.stops.length > 0}
					<hr class="my-4" />
					{#if recapCurrent}
						<div class="prose prose-sm max-w-none">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html marked($walk.recap.text)}
						</div>
					{:else}
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm text-gray-600">Let your guide sum up the walk so far.</span>
							<Button size="sm" outline on:click={loadRecap} disabled={recapLoading}>
								{#if recapLoading}
									<Spinner size="4" class="mr-2" />Summarizing...
								{:else}
									<MessageDotsOutline class="mr-1" />Summarize
								{/if}
							</Button>
						</div>
					{/if}
				{/if}

				<hr class="my-4" />
				{#if $walk.stops.length === 0}
					<p class="text-sm text-gray-600">
						No stops yet. Update your location while walking to add stops.
					</p>
				{:else}
					<ul>
						{#each $walk.stops as stop, index}
							<li class="relative pb-4 pl-6">
								{#if index < $walk.stops.length - 1}
									<div class="absolute bottom-0 left-[7px] top-4 w-0.5 bg-primary-200"></div>
								{/if}
								<div
									class="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-primary-800 bg-white"
								></div>
								<div class="text-sm">
									<span class="font-bold text-primary-800">{formatWalkTime(stop.at)}</span>
									<span class="ml-1 text-gray-700">{getStopLabel(stop)}</span>
								</div>
								{#if stopPlaces[index]?.length > 0}
									<ul class="mt-1 text-sm">
										{#each stopPlaces[index] as place}
											<li class="flex items-baseline">
												<CheckCircleSolid size="xs" class="mr-1 shrink-0 text-green-600" />
												<span>
													{#if CLASSES[place.cls]?.emoji}
														<span class="mr-0.5">{CLASSES[place.cls].emoji}</span>
													{/if}
													<span class="font-medium">{place.title}</span>
													{#if place.revisit}
														<span class="text-xs text-gray-500">(again)</span>
													{/if}
												</span>
											</li>
										{/each}
									</ul>
								{:else}
									<div class="mt-1 text-xs text-gray-500">No places directly at this stop.</div>
								{/if}
								{#if stopStories[index]?.length > 0}
									<ul class="mt-1 text-sm">
										{#each stopStories[index] as story}
											<li class="flex items-baseline text-gray-700">
												<MessageDotsOutline size="xs" class="mr-1 shrink-0" />
												<i>{story.headline || 'Story'}</i>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				<hr class="my-4" />
				{#if confirmNewWalk}
					<Alert color="yellow" class="text-sm">
						<div>Starting a new walk discards this walk and locates you again.</div>
						<div class="mt-2 flex justify-end gap-2">
							<Button color="alternative" size="xs" on:click={() => (confirmNewWalk = false)}>
								Cancel
							</Button>
							<Button color="red" size="xs" on:click={handleNewWalk}>Start new walk</Button>
						</div>
					</Alert>
				{:else}
					<div class="flex justify-end">
						<Button color="alternative" size="sm" on:click={() => (confirmNewWalk = true)}>
							<TrackingOutline class="mr-2" />Start new walk
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</Modal>
