<script>
	// Svelte
	import { onMount } from 'svelte';

	// Geolocation
	import Geolocation from 'svelte-geolocation';

	// UI components
	import { Navbar, Listgroup, Button } from 'flowbite-svelte';

	// Icons
	import { MapPinAltOutline, RefreshOutline, FileOutline } from 'flowbite-svelte-icons';

	const nArticles = 20;
	const radius = 2000;

	let appName = 'City Wanderer';
	let lang = 'de';
	let coords = [];
	let articles;

	// load articles
	const updateArticles = async () => {
		try {
			const response = await fetch(
				`https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coords[1]}|${coords[0]}&gsradius=${radius}&gslimit=${nArticles}&format=json&origin=*`
			);
			const data = await response.json();
			articles = data.query.geosearch;
			console.log(articles);
		} catch (error) {
			console.error(error);
		}
	};
</script>

<Navbar>
	<h1 class="text-xl">{appName}</h1>
</Navbar>
<main id="main" class="p-4">
	<div class="flex">
		<div class="flex-auto">
			<h2 class="text-lg">Coordinates</h2>
			<Geolocation getPosition bind:coords />
			{#if !coords || coords.length < 2}
				<p>... loading</p>
			{:else}
				<p>Latitude: {coords[0]}</p>
				<p>Longitude: {coords[1]}</p>
			{/if}
		</div>
		<div class="flex-none">
			<a
				href={`https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`}
				target="_blank"
				><Button pill class="!p-2" disabled={!coords || coords.length < 2}>
					<MapPinAltOutline />
				</Button></a
			>
		</div>
	</div>
	<hr class="m-4" />
	<div class="flex mb-2">
		<h2 class="text-lg flex-auto">Articles</h2>
		<Button on:click={updateArticles} disabled={!coords || coords.length < 2} pill class="!p-2"
			><RefreshOutline /></Button
		>
	</div>
	{#if articles}
		<Listgroup items={articles} let:item>
			<div class="flex">
				<FileOutline class="!mr-2" />
				<a href={`https://${lang}.wikipedia.org/?curid=${item?.pageid}`} target="_blank"
					>{item?.title}
				</a>
			</div>
		</Listgroup>
	{/if}
</main>
