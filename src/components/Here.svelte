<script>
	import { placesHere } from '../stores';
	import PlaceItem from './PlaceItem.svelte';
	import { Listgroup, Alert } from 'flowbite-svelte';
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
{/if}
