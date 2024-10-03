<script>
	import { Listgroup, Alert } from 'flowbite-svelte';
	import PlaceItem from './PlaceItem.svelte';
	import { placesNearby, preferences } from '../stores.js';
	import { LandmarkOutline } from 'flowbite-svelte-icons';
</script>

<div class="mb-2 flex flex items-center text-primary-800">
	<LandmarkOutline />
	<h2 class="ml-2 flex-auto text-xl">Nearby</h2>
</div>
{#if $placesNearby}
	{#if $placesNearby.length === 0}
		<Alert color="primary"
			><i
				>No further places found within {$preferences.radius}&nbsp;m radius&mdash;you can increase
				the radius in the user preferences.</i
			></Alert
		>
	{:else}
		<Listgroup items={$placesNearby} let:item>
			<PlaceItem {item} showDistance />
		</Listgroup>
	{/if}
{/if}
