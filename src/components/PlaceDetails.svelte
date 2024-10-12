<script>
	import { onMount } from 'svelte';
	import { lang } from '../constants.js';
	import { Modal } from 'flowbite-svelte';
	import {
		FileOutline,
		MapPinAltOutline,
		GlobeOutline,
		SearchOutline
	} from 'flowbite-svelte-icons';
	import { summarizeArticle } from '../util/ai.js';
	import { coordinates, placesSurrounding } from '../stores.js';
	import PlaceStars from './PlaceStars.svelte';

	export let visible = false;
	export let item;
	$: isSurroundingPlace = $placesSurrounding.find((place) => place.title === item.title);
	let summary = '';

	onMount(async () => {
		if (item.pageid || item.wikipedia) {
			const url = item.pageid
				? `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&pageids=${item.pageid}&origin=*`
				: `https://${item.wikipedia.split(':')[0]}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&titles=${item.wikipedia.split(':')[1]}&origin=*`;
			const response = await fetch(url);
			const data = await response.json();
			summary = await summarizeArticle(Object.values(data.query.pages)[0].extract);
		} else if (item.description) {
			summary = await summarizeArticle(`${item.title}. ${item.description} (${item.type})`);
		}
	});
</script>

<Modal
	title={item.title}
	bind:open={visible}
	autoclose
	bodyClass="p-0 md:p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain"
>
	<div class="flex flex-col">
		{#if item.image}
			<img src={item.image} alt={item.title} class="mb-2 max-h-64 object-cover" />
		{/if}
		<div class="p-4">
			<div class="flex flex-auto">
				{#if summary}
					{summary}
				{:else}
					...
				{/if}
			</div>
			{#if !isSurroundingPlace}
				<hr class="my-4" />
				{#if item.labels}
					<div class="flex flex-wrap">
						{#each item.labels as label}
							<div class="mb-1 mr-2 rounded-full bg-primary-100 px-2 text-xs text-primary-800">
								{label}
							</div>
						{/each}
					</div>
				{/if}
				<hr class="my-4" />
				<PlaceStars {item} detail />
			{/if}
		</div>
	</div>
	<svelte:fragment slot="footer">
		<div class="flex w-full text-xs">
			{#if item.pageid}
				<a
					href={`https://${lang}.m.wikipedia.org/?curid=${item.pageid}`}
					target="_blank"
					class="flex flex-auto"
				>
					<FileOutline class="!mr-2" />Wikipedia
				</a>
			{:else if item.wikipedia}
				<!-- item.wikipedia="de:name" -> "https://de.wikipedia.org/wiki/name" -->
				<a
					href={`https://${item.wikipedia.split(':')[0]}.wikipedia.org/wiki/${item.wikipedia.split(':')[1]}`}
					target="_blank"
					class="flex flex-auto"
				>
					<FileOutline class="!mr-1" />Wikipedia
				</a>
			{:else if item.url}
				<a href={item.url} target="_blank" class="flex flex-auto">
					<GlobeOutline class="!mr-1" />Page
				</a>
			{/if}
			<a
				href={`https://www.google.com/search?q=${item.title} ${$coordinates.town}`}
				target="_blank"
				class="flex flex-auto"
			>
				<SearchOutline class="!mr-1" />Search
			</a>
			<a
				href={`https://www.google.com/maps/search/?api=1&query=${item.title}&near=${$coordinates.latitude},${$coordinates.longitude}`}
				target="_blank"
				class="flex"
			>
				<span>
					{#if item.dist >= 50}
						{Math.floor(item.dist / 50) * 50}&nbsp;m
					{:else}
						here
					{/if}
				</span>
				<MapPinAltOutline class="!ml-1" />
			</a>
		</div>
	</svelte:fragment>
</Modal>
