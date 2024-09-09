<script>
	// Stores
	import { coordinates, updateCoordinates } from '../stores.js';

	// Constants
	import { lang, appName, nArticles } from '../constants.js';

	// Components
	import { Navbar, NavBrand, Button, Spinner, Label, Range } from 'flowbite-svelte';

	// Icons
	import { MapPinAltOutline, RefreshOutline, BuildingOutline } from 'flowbite-svelte-icons';
	import PlacesList from '../PlacesList.svelte';

	let radius = 1000;

	let places = null;
	let loading = false;

	// load articles
	const updateArticles = async () => {
		try {
			if (!$coordinates) {
				return;
			}
			const response = await fetch(
				`https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${$coordinates.latitude}|${$coordinates.longitude}&gsradius=${radius}&gslimit=${nArticles}&format=json&origin=*`
			);
			const data = await response.json();
			places = data.query.geosearch;
		} catch (error) {
			console.error(error);
		}
	};

	const update = async () => {
		try {
			loading = true;
			places = null;
			$coordinates = null;
			await updateCoordinates();
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
				{#if loading && !$coordinates}
					<Spinner size="3" />
				{:else}
					<div class="text-xs">
						{#if !$coordinates}
							<p>Click the refresh button to get your current position</p>
						{:else}
							<div>
								<a
									href={`https://www.google.com/maps/search/?api=1&query=${$coordinates.latitude},${$coordinates.longitude}`}
									target="_blank"
									class="flex"
									><MapPinAltOutline size="sm" class="mr-1" />Lat.: {$coordinates.latitude}; Long.: {$coordinates.longitude}</a
								>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
		<div class="flex-none">
			<Button on:click={update} pill class="!p-2"><RefreshOutline /></Button>
		</div>
	</div>
	<hr class="m-4" />
	<div>
		<Label>Search radius ({radius}&nbsp;m)</Label>
		<Range
			id="range1"
			bind:value={radius}
			min="100"
			max="3000"
			step="100"
			on:change={updateArticles}
		/>
	</div>
	<hr class="m-4" />
	<PlacesList {places} {loading} />
</main>
