<script>
	import { onMount } from 'svelte';
	import { lang } from './constants.js';
	import { Modal } from 'flowbite-svelte';
	import { FileOutline, MapPinAltOutline } from 'flowbite-svelte-icons';
	import { summarizeArticle } from './AI.js';

	export let visible = false;
	export let item;

	// Load Wikipedia article text
	onMount(async () => {
		const response = await fetch(
			`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&pageids=${item.pageid}&origin=*`
		);
		const data = await response.json();
		// use summarizeArticle() to get a shorter text
		item.extract = await summarizeArticle(data.query.pages[item.pageid].extract);
	});
</script>

<Modal title={item.title} bind:open={visible} autoclose>
	<div class="flex flex-col">
		<!-- Load Wikipedia article text -->
		<div class="flex flex-auto">
			{#if item.extract}
				{item.extract}
			{:else}
				Loading...
			{/if}
		</div>
		<hr class="my-4" />
		<div class="flex">
			<a
				href={`https://${lang}.m.wikipedia.org/?curid=${item.pageid}`}
				target="_blank"
				class="flex flex-auto"
			>
				<FileOutline class="!mr-2" />Wikipedia
			</a>
			<a
				href={`https://www.google.com/maps/search/?api=1&query=${item.title}`}
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
