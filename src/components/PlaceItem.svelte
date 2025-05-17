<script>
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import PlaceDirection from './PlaceDirection.svelte';
	import { placeDetailsVisible } from '../stores.js';
	import PlaceDetailsModal from './PlaceDetailsModal.svelte';

	export let item;
	export let showDistance = false;
	export let hideRating = false;
</script>

{#if item}
	<button
		on:click={() => {
			placeDetailsVisible.set(item.title);
		}}
		class="flex min-h-10 w-full flex-col align-top"
	>
		<div class="w-row -ml-2 flex w-full space-x-2">
			<div class="h-16 w-16">
				{#if item.imageThumb}
					<!-- svelte-ignore a11y-missing-attribute -->
					<img
						src={item.imageThumb}
						class="!h-16 !w-16 !max-w-16 rounded-full border-2 object-cover object-center"
					/>
				{:else}
					<div class="h-16 w-16 rounded-full bg-gray-200"></div>
				{/if}
			</div>
			<div class="w-col flex w-full">
				<div class="flex flex-auto flex-col overflow-hidden text-left">
					<div class="text-md">
						<PlaceTitle place={item} />
					</div>
					{#if !hideRating}
						<div>
							<PlaceStars {item} />
						</div>
					{/if}
				</div>
				{#if showDistance}
					<div class="-mr-4 ml-2 text-right text-xs">
						{#if item.dist >= 50}
							{Math.floor(item.dist / 50) * 50}&nbsp;m
						{:else}
							here
						{/if}
						<br />
						<PlaceDirection {item} />
					</div>
				{/if}
			</div>
		</div>
	</button>
	<PlaceDetailsModal {item} />
{/if}
