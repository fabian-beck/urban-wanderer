<script>
	import { onMount } from 'svelte';
	import { Button, Modal, Spinner } from 'flowbite-svelte';
	import {
		FileOutline,
		MapPinAltOutline,
		GlobeOutline,
		ArrowRightOutline
	} from 'flowbite-svelte-icons';
	import { summarizeArticle, searchPlaceWeb } from '../util/ai.js';
	import { coordinates, placesSurrounding, preferences } from '../stores.js';
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import { marked } from 'marked';

	export let visible = false;
	export let item;
	$: isSurroundingPlace = $placesSurrounding.find((place) => place.title === item.title);
	let summary = '';
	let weblinks = '';
	let weblinksLoading = false;

	onMount(() => {
		(async () => {
			if (item.pageid || item.wikipedia) {
				const url = item.pageid
					? `https://${item.lang || $preferences.lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&pageids=${item.pageid}&origin=*`
					: `https://${item.wikipedia.split(':')[0]}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&titles=${item.wikipedia.split(':')[1]}&origin=*`;
				const response = await fetch(url);
				const data = await response.json();
				summary = await summarizeArticle(Object.values(data.query.pages)[0].extract);
			} else if (item.description) {
				summary = await summarizeArticle(`${item.title}. ${item.description} (${item.type})`);
			}
		})();
	});

	const loadWeblinks = async () => {
		weblinksLoading = true;
		weblinks = await searchPlaceWeb(item.title);
		weblinksLoading = false;
	};
</script>

<Modal title={item.title} bind:open={visible} classBody="p-0 overscroll-none" classDialog="">
	<svelte:fragment slot="header">
		<span class="text-xl"><PlaceTitle place={item} /></span>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		{#if item.image}
			<img src={item.image} alt={item.title} class="mb-2 max-h-64 object-cover" />
		{/if}
		<div class="p-4">
			{#if item.pageid || item.wikipedia || item.description}
				<div class="flex flex-auto">
					{#if summary}
						{summary}
					{:else}
						...
					{/if}
				</div>
			{/if}
			{#if !isSurroundingPlace}
				<hr class="my-4" />
				<h3 class="text-lg">More about {item.title}</h3>
				<div>
					{#if weblinks}
						<ul>
							{#each weblinks as weblink}
								<!-- skip wikipedia links -->
								{#if !weblink.source_domain.includes('wikipedia')}
									<li class="mt-2">
										<a href={weblink.url} target="_blank" class="text-primary-800">
											{@html marked(weblink.text + ' (' + weblink.source_domain + ')')}
										</a>
									</li>
								{/if}
							{/each}
						</ul>
					{:else if weblinksLoading}
						<div class="m-6 flex justify-center">
							<Spinner size="6" />
						</div>
					{:else}
						<Button on:click={loadWeblinks} pill size="xs" outline class="mt-2"
							><ArrowRightOutline />
							Search the web
						</Button>
					{/if}
				</div>
			{/if}
			<hr class="my-4" />
			{#if !isSurroundingPlace}
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
			{#if item.lon && item.lat}
				<hr class="my-4" />
				<Button
					on:click={() => (window.location.href = `/?lat=${item.lat}&lon=${item.lon}`)}
					class="m-1 mt-2 flex items-center rounded-full bg-primary-800 p-2 text-white shadow-lg"
				>
					<MapPinAltOutline class="!mr-1" />Jump to this place
				</Button>
			{/if}
		</div>
	</div>
	<svelte:fragment slot="footer">
		<div class="flex w-full text-xs">
			{#if item.pageid}
				<a
					href={`https://${item.lang || $preferences.lang}.m.wikipedia.org/?curid=${item.pageid}`}
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
			{:else}
				<span class="flex flex-auto"></span>
			{/if}
			{#if item.lon && item.lat}
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`}
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
			{:else if item.title}
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${item.title}${$coordinates.town ? ', ' + $coordinates.town : ''}`}
					target="_blank"
					class="flex"
				>
					<MapPinAltOutline class="!ml-1" />
				</a>
			{/if}
		</div>
	</svelte:fragment>
</Modal>
