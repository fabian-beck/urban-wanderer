<script>
	import { placesHere, osmPlaces } from '../stores';
	import PlaceItem from './PlaceItem.svelte';
	import { Listgroup, Alert } from 'flowbite-svelte';
	import { FlagOutline } from 'flowbite-svelte-icons';
</script>

<div class="mb-2 flex items-center text-primary-800">
	<FlagOutline />
	<h2 class="ml-2 flex-auto text-xl">Here</h2>
</div>

{#if $placesHere}
	{#if $placesHere.length === 0}
		<FlagOutline /><Alert color="primary">Found none&mdash;maybe, walk a bit and refresh?</Alert>
	{:else}
		<div class="mb-1 mt-2">Most relevant</div>
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
