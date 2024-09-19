<script>
	import { placesHere, osmPlaces } from '../stores';
	import PlaceItem from './PlaceItem.svelte';
	import { Listgroup, Alert, List, P } from 'flowbite-svelte';
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Here</h2>
</div>

{#if $placesHere}
	{#if $placesHere.length === 0}
		<Alert color="primary">Found none&mdash;maybe, walk a bit and refresh?</Alert>
	{:else}
		<Listgroup items={$placesHere} let:item>
			<PlaceItem {item} />
		</Listgroup>
	{/if}
	{#if $osmPlaces.length > 0}
		<div class="mb-1 mt-2">Other places</div>
		<Listgroup items={$osmPlaces} let:item>
			<PlaceItem {item} />
		</Listgroup>
	{/if}
{/if}
