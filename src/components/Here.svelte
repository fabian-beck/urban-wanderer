<script>
	import { placesHere, placesSurrounding } from '../stores';
	import PlaceItem from './PlaceItem.svelte';
	import { Listgroup, Alert } from 'flowbite-svelte';
	import { FlagOutline } from 'flowbite-svelte-icons';
</script>

<div class="mb-2 flex items-center text-primary-800">
	<FlagOutline />
	<h2 class="ml-2 flex-auto text-xl">Here</h2>
</div>

{#if $placesHere?.length > 0}
	<Listgroup items={$placesHere} let:item itemDefaultClass="!px-0">
		<PlaceItem {item} />
	</Listgroup>
{:else}
	<Alert color="primary"
		><i
			>No places found directly at your position&mdash;maybe, walk a bit to find some interesting
			ones.</i
		></Alert
	>
{/if}
{#if $placesSurrounding.length > 0}
	<div class="mb-1 mt-2">You are in:</div>
	<Listgroup items={$placesSurrounding} let:item>
		<PlaceItem {item} hideRating />
	</Listgroup>
{/if}
