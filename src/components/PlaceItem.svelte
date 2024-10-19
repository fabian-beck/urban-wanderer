<script>
	import PlaceDetails from './PlaceDetails.svelte';
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import PlaceDirection from './PlaceDirection.svelte';

	export let item;
	export let showDistance = false;
	export let hideRating = false;
	let detailsVisible = false;
</script>

{#if item}
	<button
		on:click={() => {
			detailsVisible = true;
		}}
		class="flex min-h-10 w-full flex-col align-top"
	>
		<div class="flex w-full">
			<div class="flex flex-auto overflow-hidden text-left">
				<span class="text-m mr-lg text-lg">
					<PlaceTitle {item} />
				</span>
			</div>
			{#if showDistance}
				<div class="ml-2 text-right text-xs">
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
		{#if !hideRating}
			<PlaceStars {item} />
		{/if}
	</button>
	<PlaceDetails bind:visible={detailsVisible} {item} />
{/if}
