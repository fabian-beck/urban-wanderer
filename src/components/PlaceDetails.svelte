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
	import { coordinates } from '../stores.js';

	export let visible = false;
	export let item;

	onMount(async () => {
		if (item.pageid || item.wikipedia) {
			const url = item.pageid
				? `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&pageids=${item.pageid}&origin=*`
				: `https://${item.wikipedia.split(':')[0]}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&titles=${item.wikipedia.split(':')[1]}&origin=*`;
			const response = await fetch(url);
			const data = await response.json();
			item.summary = await summarizeArticle(Object.values(data.query.pages)[0].extract);
		} else if (item.description) {
			item.summary = await summarizeArticle(`${item.title}. ${item.description} (${item.type})`);
		}
	});
</script>

<Modal title={item.title} bind:open={visible} autoclose>
	<div class="flex flex-col">
		<div class="flex flex-auto">
			{#if item.summary}
				{item.summary}
			{/if}
		</div>
		<hr class="my-4" />
		<div class="flex">
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
					<FileOutline class="!mr-2" />Wikipedia
				</a>
			{:else if item.url}
				<a href={item.url} target="_blank" class="flex flex-auto">
					<GlobeOutline class="!mr-2" />Web page
				</a>
			{:else}
				<a
					href={`https://www.google.com/search?q=${item.title} ${$coordinates.town}`}
					target="_blank"
					class="flex flex-auto"
				>
					<SearchOutline class="!mr-2" />Web search
				</a>
			{/if}
			<a
				href={`https://www.google.com/maps/search/?api=1&query=${item.title}&near=${$coordinates.latitude},${$coordinates.longitude}`}
				target="_blank"
				class="flex"
			>
				<span class="text-xs">
					{#if item.dist >= 50}
						{Math.floor(item.dist / 50) * 50}&nbsp;m
					{:else}
						here
					{/if}
				</span>
				<MapPinAltOutline />
			</a>
		</div>
	</div>
</Modal>
