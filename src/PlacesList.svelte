<script>
	import { Listgroup, Spinner, Alert } from 'flowbite-svelte';
	import PlaceItem from './PlaceItem.svelte';
	import { nArticles } from './constants.js';
	import { places, preferences } from './stores.js';

	export let loading = false;
</script>

<div class="mb-2 flex">
	<h2 class="flex-auto text-lg">Relevant Places</h2>
	{#if $places}
		<p class="flex-none text-sm">
			{$places.length}{$places.length === nArticles ? '+' : ''} place{$places.length > 1 ||
			$places.length === 0
				? 's'
				: ''} found
		</p>
	{/if}
</div>
{#if loading}
	<div class="m-6 flex justify-center">
		<Spinner />
	</div>
{:else if $places}
	{#if $places.length === 0}
		<Alert color="primary">Found none&mdash;maybe, walk a bit and refresh?</Alert>
	{:else}
		<Listgroup
			items={$places.filter(
				(item) => item.labels && item.labels.some((label) => $preferences.labels.includes(label))
			)}
			let:item
		>
			<PlaceItem {item} />
		</Listgroup>
	{/if}
{:else}
	<div class="m-6 flex justify-center">
		<img src="urban-wanderer-icon.png" alt="logo" class="w-24 opacity-50" />
	</div>
{/if}
