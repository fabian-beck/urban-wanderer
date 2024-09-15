<script>
	import PlaceDetails from './PlaceDetails.svelte';

	export let item;
	export let showDistance = false;
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
		<div class="mt-1 text-left text-xs">
			{#if item.labels}
				{item.labels.join(', ')}
			{:else}
				... computing labels
			{/if}
		</div>
	</button>
	<PlaceDetails bind:visible={detailsVisible} {item} />
{/if}
