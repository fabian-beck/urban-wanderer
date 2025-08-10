<script>
	import { onMount } from 'svelte';
	import { Button, Modal } from 'flowbite-svelte';
	import {
		FileOutline,
		MapPinAltOutline,
		GlobeOutline,
		DatabaseOutline
	} from 'flowbite-svelte-icons';
	import { summarizeArticle } from '../util/ai.js';
	import { coordinates, placesSurrounding, preferences, placeDetailsVisible } from '../stores.js';
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import { derived } from 'svelte/store';
	import PlaceFactList from './PlaceFactList.svelte';

	export let place;
	const visible = derived(
		placeDetailsVisible,
		($placeDetailsVisible) => $placeDetailsVisible === place.title
	);

	$: isSurroundingPlace = $placesSurrounding.find((p) => p.title === place.title);
	let summary = '';
	let placeFactListComponent;

	// Trigger fact loading when modal becomes visible
	$: if ($visible && placeFactListComponent) {
		placeFactListComponent.loadFacts();
	}

	onMount(() => {
		(async () => {
			if (place.pageid || (place.wikipedia && !place.wikipedia.includes('#'))) {
				const url = place.pageid
					? `https://${place.lang || $preferences.lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&pageids=${place.pageid}&origin=*`
					: `https://${place.wikipedia.split(':')[0]}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&titles=${place.wikipedia.split(':')[1]}&origin=*`;
				const response = await fetch(url);
				const data = await response.json();
				summary = await summarizeArticle(Object.values(data.query.pages)[0].extract);
			} else if (place.description) {
				summary = await summarizeArticle(`${place.title}. ${place.description} (${place.type})`);
			}
		})();
	});
</script>

<Modal
	title={place.title}
	classBody="p-0 overscroll-none"
	classDialog=""
	open={$visible}
	on:close={() => placeDetailsVisible.set('')}
>
	<svelte:fragment slot="header">
		<span class="text-xl"><PlaceTitle {place} /></span>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		{#if place.image}
			<img src={place.image} alt={place.title} class="mb-2 max-h-64 object-cover" />
		{/if}
		<div class="p-4">
			{#if place.pageid || place.wikipedia || place.description}
				<div class="flex flex-auto">
					{#if summary}
						{summary}
					{:else}
						...
					{/if}
				</div>
			{/if}
			<hr class="my-4" />
			<PlaceStars item={place} detail />
			{#if !isSurroundingPlace}
				{#if place.labels}
					<hr class="my-4" />
					<div class="flex flex-wrap">
						{#each place.labels as label}
							<div class="mb-1 mr-2 rounded-full bg-primary-100 px-2 text-xs text-primary-800">
								{label}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
			<hr class="my-4" />
			<h3 class="mb-2 text-lg">Facts</h3>
			<PlaceFactList {place} bind:this={placeFactListComponent} />
			{#if place.lon && place.lat}
				<hr class="my-4" />
				<Button
					on:click={() => (window.location.href = `/?lat=${place.lat}&lon=${place.lon}`)}
					class="m-1 mt-2 flex items-center rounded-full bg-primary-800 p-2 text-white shadow-lg"
				>
					<MapPinAltOutline class="!mr-1" />Jump to this place
				</Button>
			{/if}
		</div>
	</div>
	<svelte:fragment slot="footer">
		<div class="flex w-full justify-between text-xs">
			<div class="flex">
				{#if place.pageid}
					<a
						href={`https://${place.lang || $preferences.lang}.m.wikipedia.org/?curid=${place.pageid}`}
						target="_blank"
						class="mr-3 flex"
					>
						<FileOutline class="!mr-1" />Wikipedia
					</a>
				{:else if place.wikipedia}
					<!-- item.wikipedia="de:name" -> "https://de.wikipedia.org/wiki/name" -->
					<a
						href={`https://${place.wikipedia.split(':')[0]}.wikipedia.org/wiki/${place.wikipedia.split(':')[1]}`}
						target="_blank"
						class="mr-3 flex"
					>
						<FileOutline class="!mr-1" />Wikipedia
					</a>
				{:else if place.url}
					<a href={place.url} target="_blank" class="mr-3 flex">
						<GlobeOutline class="!mr-1" />Page
					</a>
				{/if}
				{#if place.wikidata}
					<a href={`https://www.wikidata.org/wiki/${place.wikidata}`} target="_blank" class="flex">
						<DatabaseOutline class="!mr-1" />WikiData
					</a>
				{/if}
			</div>
			{#if place.lon && place.lat}
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`}
					target="_blank"
					class="flex"
				>
					<span>
						{#if place.dist >= 50}
							{Math.floor(place.dist / 50) * 50}&nbsp;m
						{:else}
							here
						{/if}
					</span>
					<MapPinAltOutline class="!ml-1" />
				</a>
			{:else if place.title}
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${place.title}${$coordinates.town ? ', ' + $coordinates.town : ''}`}
					target="_blank"
					class="flex"
				>
					<MapPinAltOutline class="!ml-1" />
				</a>
			{/if}
		</div>
	</svelte:fragment>
</Modal>
