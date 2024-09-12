<script>
	import { MapPinAltOutline } from 'flowbite-svelte-icons';
	import PlaceDetails from './PlaceDetails.svelte';

	export let item;
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
			<span class="flex flex-auto">
				<b>{item.title}</b>
			</span>
			<a
				href={`https://www.google.com/maps/search/?api=1&query=${item.title}`}
				target="_blank"
				class="flex"
			>
				<span class="text-xs">
					{#if item.dist >= 50}
						{Math.floor(item.dist / 50) * 50}&nbsp;m
					{:else}
						here
					{/if}
				</span>
				<MapPinAltOutline />
			</a>
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
