<script>
	import { Listgroup, Spinner, Alert } from 'flowbite-svelte';
	import PlaceItem from './PlaceItem.svelte';
	import { nArticles } from './constants.js';
	import { places, preferences } from './stores.js';

	$: placesFiltered = $places?.filter(
		(item) => item.labels && item.labels.some((label) => $preferences.labels.includes(label))
	);
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Nearby</h2>
	{#if $places}
		<p class="flex-none text-sm">
			{$places.length}{$places.length === nArticles ? '+' : ''} place{$places.length > 1 ||
			$places.length === 0
				? 's'
				: ''} found
		</p>
	{/if}
</div>
{#if $places}
	{#if $places.length === 0}
		<Alert color="primary">Found none&mdash;maybe, walk a bit and refresh?</Alert>
	{:else}
		<div class="mb-1">Most relevant</div>
		<Listgroup items={placesFiltered} let:item>
			<PlaceItem {item} />
		</Listgroup>
		{#if $places.length > placesFiltered.length}
			<div class="mb-1 mt-2">Other places</div>
			<Listgroup items={$places.filter((item) => !placesFiltered.includes(item))} let:item>
				<PlaceItem {item} />
			</Listgroup>
		{/if}
	{/if}
{/if}
