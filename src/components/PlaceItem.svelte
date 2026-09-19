<script>
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import PlaceDirection from './PlaceDirection.svelte';
	import { placeDetailsVisible, preferences, visitedPlaceIdentities } from '../stores.js';
	import { getPlaceIdentity } from '../util/place-identity.js';
	import { CheckOutline } from 'flowbite-svelte-icons';
	import PlaceDetailsModal from './PlaceDetailsModal.svelte';
	import PlaceLabels from './PlaceLabels.svelte';
	import { PLACE_HIGH_RATED_MIN_STARS, PLACE_VISIBLE_MIN_STARS } from '../constants/core.js';

	export let place;
	export let showDistance = false;
	export let hideRating = false;

	$: isCompact = !hideRating && (place?.stars || 0) <= PLACE_VISIBLE_MIN_STARS;
	$: visited = $visitedPlaceIdentities.has(getPlaceIdentity(place));
	$: showLabels =
		!hideRating &&
		(place?.stars || 0) >= PLACE_HIGH_RATED_MIN_STARS &&
		place?.labels?.some((label) => $preferences.labels?.includes(label));
</script>

{#if place}
	<button
		on:click={() => {
			placeDetailsVisible.set(place.title);
		}}
		class="flex w-full flex-col align-top {isCompact ? 'min-h-8' : 'min-h-10'}"
	>
		<div class="w-row flex w-full {isCompact ? 'space-x-2' : '-ml-2 space-x-2'}">
			<div class={isCompact ? 'h-10 w-10 shrink-0' : 'h-16 w-16 shrink-0'}>
				{#if place.imageThumb}
					<img
						src={place.imageThumb}
						alt={place.title}
						class="{isCompact
							? '!h-10 !w-10 !max-w-10'
							: '!h-16 !w-16 !max-w-16'} rounded-full border-2 object-cover object-center"
					/>
				{:else}
					<div class="{isCompact ? 'h-10 w-10' : 'h-16 w-16'} rounded-full bg-gray-200"></div>
				{/if}
			</div>
			<div class="w-col flex w-full">
				<div class="flex flex-auto flex-col overflow-hidden text-left">
					<div class={isCompact ? 'text-sm leading-tight' : 'text-md'}>
						<PlaceTitle {place} />
						{#if visited}
							<span
								class="ml-1 inline-flex items-center rounded-full bg-green-100 px-1.5 align-middle text-[10px] font-medium text-green-800"
							>
								<CheckOutline size="xs" class="mr-0.5" />visited
							</span>
						{/if}
					</div>
					{#if !hideRating}
						<div>
							<PlaceStars item={place} dense={showLabels} />
						</div>
					{/if}
					{#if showLabels}
						<div class="mt-0">
							<PlaceLabels labels={place.labels} matchingOnly />
						</div>
					{/if}
				</div>
				{#if showDistance}
					<div class="{isCompact ? 'ml-1' : '-mr-4 ml-2'} text-right text-xs">
						{#if place.dist >= 50}
							{Math.floor(place.dist / 50) * 50}&nbsp;m
						{:else}
							here
						{/if}
						<br />
						<PlaceDirection item={place} />
					</div>
				{/if}
			</div>
		</div>
	</button>
	<PlaceDetailsModal {place} />
{/if}
