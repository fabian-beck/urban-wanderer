<script>
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import PlaceDirection from './PlaceDirection.svelte';
	import { placeDetailsVisible } from '../stores.js';
	import PlaceDetailsModal from './PlaceDetailsModal.svelte';

	export let place;
	export let showDistance = false;
	export let hideRating = false;
</script>

{#if place}
	<button
		on:click={() => {
			placeDetailsVisible.set(place.title);
		}}
		class="flex min-h-10 w-full flex-col align-top"
	>
		<div class="w-row -ml-2 flex w-full space-x-2">
			<div class="h-16 w-16">
				{#if place.imageThumb}
					<!-- svelte-ignore a11y-missing-attribute -->
					<img
						src={place.imageThumb}
						class="!h-16 !w-16 !max-w-16 rounded-full border-2 object-cover object-center"
					/>
				{:else}
					<div class="h-16 w-16 rounded-full bg-gray-200"></div>
				{/if}
			</div>
			<div class="w-col flex w-full">
				<div class="flex flex-auto flex-col overflow-hidden text-left">
					<div class="text-md">
						<PlaceTitle {place} />
					</div>
					{#if !hideRating}
						<div>
							<PlaceStars item={place} />
						</div>
					{/if}
				</div>
				{#if showDistance}
					<div class="-mr-4 ml-2 text-right text-xs">
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
