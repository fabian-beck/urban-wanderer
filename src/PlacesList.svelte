<script>
	// Components
	import { Listgroup, Spinner, Alert } from 'flowbite-svelte';
	import PlaceItem from './PlaceItem.svelte';
	import nArticles from './constants.js';

	export let places;
	export let loading = false;
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Relevant Places</h2>
	{#if places}
		<p class="flex-none text-sm">
			{places.length}{places.length === nArticles ? '+' : ''} place{places.length > 1 ||
			places.length === 0
				? 's'
				: ''} found
		</p>
	{/if}
</div>
{#if loading}
	<div class="m-6 flex justify-center">
		<Spinner />
	</div>
{:else if places}
	{#if places.length === 0}
		<Alert color="primary">Found none&mdash;maybe, walk a bit and refresh?</Alert>
	{:else}
		<Listgroup items={places} let:item>
			<PlaceItem {item} />
		</Listgroup>
	{/if}
{/if}
