<script>
	import PlaceDetails from './PlaceDetails.svelte';
	import { StarSolid } from 'flowbite-svelte-icons';
	import { preferences } from '../stores.js';

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
		class="w-full"
	>
		<div class="flex">
			<span class="flex flex-auto overflow-hidden text-left">
				<b>{item.title}</b>
			</span>
			{#if showDistance}
				<span class="text-right text-xs">
					{#if item.dist >= 50}
						{Math.floor(item.dist / 50) * 50}&nbsp;m
					{:else}
						here
					{/if}
				</span>
			{/if}
		</div>
		{#if !hideRating}
			<div class="mt-1 flex text-left text-xs">
				{#if item.wikipedia || item.pageid}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
				{#if item.labels && item.labels.some((label) => $preferences.labels.includes(label))}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
			</div>
		{/if}
	</button>
	<PlaceDetails bind:visible={detailsVisible} {item} />
{/if}
