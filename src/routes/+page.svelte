<script>
	// // Geolocation
	// import Geolocation from 'svelte-geolocation';
	import { Geolocation } from '@capacitor/geolocation';

	// UI components
	import {
		Navbar,
		NavBrand,
		Listgroup,
		Button,
		Spinner,
		Alert,
		Label,
		Range
	} from 'flowbite-svelte';

	// Icons
	import {
		MapPinAltOutline,
		RefreshOutline,
		FileOutline,
		BuildingOutline
	} from 'flowbite-svelte-icons';

	const nArticles = 20;
	let radius = 1000;

	let appName = 'City Wanderer';
	let lang = 'de';
	let places = null;
	let coordinates;
	let loading = false;

	// load articles
	const updateArticles = async () => {
		try {
			const response = await fetch(
				`https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coordinates.coords.latitude}|${coordinates.coords.longitude}&gsradius=${radius}&gslimit=${nArticles}&format=json&origin=*`
			);
			const data = await response.json();
			places = data.query.geosearch;
		} catch (error) {
			console.error(error);
		}
	};

	const updatePosition = async () => {
		try {
			loading = true;
			places = null;
			coordinates = null;
			coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
			await updateArticles();
			loading = false;
		} catch (error) {
			console.error('Error getting current position', error);
		}
	};
</script>

<Navbar class="border-b" color="primary">
	<NavBrand href="/" class="text-xl">
		<BuildingOutline class="mr-2" size="lg" />
		<h1>{appName}</h1>
	</NavBrand>
</Navbar>
<main id="main" class="p-4">
	<div class="flex">
		<div class="flex-auto">
			<h2 class="text-lg">My Position</h2>
			<div class="h-4">
				{#if loading && !coordinates}
					<Spinner size="3" />
				{:else}
					<div class="text-xs">
						{#if !coordinates}
							<p>Click the refresh button to get your current position</p>
						{:else}
							<div>
								<a
									href={`https://www.google.com/maps/search/?api=1&query=${coordinates.coords.latitude},${coordinates.coords.longitude}`}
									target="_blank"
									class="flex"
									><MapPinAltOutline size="sm" class="mr-2" />Lat.: {coordinates.coords.latitude};
									Long.: {coordinates.coords.longitude}</a
								>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
		<div class="flex-none">
			<Button on:click={updatePosition} pill class="!p-2"><RefreshOutline /></Button>
		</div>
	</div>
	<hr class="m-4" />
	<div>
		<Label>Search radius ({radius}m)</Label>
		<Range id="range1" bind:value={radius} min="100" max="10000" step="100" />
	</div>
	<hr class="m-4" />
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
			<Alert color="primary">Found none&mdash;maybe walk a bit and refresh?</Alert>
		{:else}
			<Listgroup items={places} let:item>
				<div class="flex">
					<a
						href={`https://${lang}.m.wikipedia.org/?curid=${item?.pageid}`}
						target="_blank"
						class="flex flex-auto"
					>
						<FileOutline class="!mr-2" />{item?.title}
					</a>
					<a href={`https://www.google.com/maps/search/?api=1&query=${item.title}`} target="_blank">
						<MapPinAltOutline />
					</a>
				</div>
			</Listgroup>
		{/if}
	{/if}
</main>
