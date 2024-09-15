<script>
	import { Listgroup, Alert } from 'flowbite-svelte';
	import PlaceItem from './PlaceItem.svelte';
	import { placesNearby, preferences } from '../stores.js';

	$: placesFiltered = $placesNearby?.filter(
		(item) => item.labels && item.labels.some((label) => $preferences.labels.includes(label))
	);
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Nearby</h2>
</div>
{#if $placesNearby}
	{#if $placesNearby.length === 0}
		<Alert color="primary">Found none&mdash;maybe, walk a bit and refresh?</Alert>
	{:else}
		<div class="mb-1">Most relevant</div>
		<Listgroup items={placesFiltered} let:item>
			<PlaceItem {item} showDistance />
		</Listgroup>
		{#if $placesNearby.length > placesFiltered.length}
			<div class="mb-1 mt-2">Other places</div>
			<Listgroup items={$placesNearby.filter((item) => !placesFiltered.includes(item))} let:item>
				<PlaceItem {item} showDistance />
			</Listgroup>
		{/if}
	{/if}
{/if}
