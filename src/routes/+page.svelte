<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		coordinates,
		places,
		errorMessage,
		storyTexts,
		loadingMessage,
		heading,
		events
	} from '../stores.js';
	import Header from '../components/Header.svelte';
	import Location from '../components/Position.svelte';
	import Nearby from '../components/Nearby.svelte';
	import { Alert, CloseButton, Spinner, Button } from 'flowbite-svelte';
	import { appName } from '../constants.js';
	import Here from '../components/Here.svelte';
	import { onMount } from 'svelte';
	import Map from '../components/Map.svelte';
	import { searchWikipediaPlaceCoordinates } from '../util/wikipedia.js';

	let loading = false;
	let urlCoordinates = null;

	const updateUrlParamsWithCoordinates = async () => {
		const newUrl = new URL($page.url);
		newUrl.searchParams.set('lat', $coordinates.latitude);
		newUrl.searchParams.set('lon', $coordinates.longitude);
		await goto(newUrl.toString(), { replaceState: false });
	};

	const update = async (coords) => {
		try {
			loading = true;
			errorMessage.set(null);
			places.reset();
			coordinates.reset();
			$storyTexts = [];
			$events = [];
			loadingMessage.set('Updating location ...');
			await coordinates.update(coords);
			await updateUrlParamsWithCoordinates();
			loadingMessage.set('Loading places ...');
			await places.update();
			loading = false;
			loadingMessage.reset();
		} catch (error) {
			loading = false;
			loadingMessage.reset();
			errorMessage.set('Error updating location: ' + error);
			console.error('Error updating location', error);
		}
	};

	const jumpToUrlCoordinates = () => {
		if (urlCoordinates) {
			update(urlCoordinates);
			urlCoordinates = null;
		}
	};

	const searchForPlace = async (placeName) => {
		try {
			loading = true;
			errorMessage.set(null);
			loadingMessage.set(`Searching for "${placeName}"...`);
			
			const placeData = await searchWikipediaPlaceCoordinates(placeName);
			await update({
				latitude: placeData.latitude,
				longitude: placeData.longitude
			});
		} catch (error) {
			loading = false;
			loadingMessage.reset();
			errorMessage.set(`Error searching for place: ${error.message}`);
			console.error('Error searching for place:', error);
		}
	};

	onMount(() => {
		const urlParams = $page.url.searchParams;
		const lat = parseFloat(urlParams.get('lat'));
		const lon = parseFloat(urlParams.get('lon'));
		if (lat && lon) {
			urlCoordinates = { latitude: lat, longitude: lon };
		}
		// set heading listener for device orientation
		window.addEventListener(
			'deviceorientationabsolute',
			(event) => {
				heading.set(event.alpha);
			},
			true
		);
	});
</script>

<Header updateRandom={() => update('random')} {searchForPlace} />
<main id="main" class="mx-auto mb-10 max-w-lg p-4 pb-24 pt-20">
	{#if urlCoordinates}
		<div class="mb-4">
			<Button on:click={jumpToUrlCoordinates} class="w-full">
				Jump to {urlCoordinates.latitude.toFixed(4)}, {urlCoordinates.longitude.toFixed(4)}
			</Button>
		</div>
	{/if}
	{#if $errorMessage}
		<Alert type="danger" class="mb-4 flex text-xs">
			<div class="flex-auto overflow-hidden">
				{$errorMessage}
			</div>
			<CloseButton on:click={() => errorMessage.set(null)} class="flex-none" />
		</Alert>
	{/if}
	{#if !loading && $coordinates}
		<Map />
		<hr class="m-4" />
		<Here />
		<hr class="m-4" />
		<Nearby />
	{:else}
		<div class="m-6 mt-20 flex justify-center">
			<img src="urban-wanderer-icon.png" alt="logo" class="w-24" />
		</div>
		<h1 class="uw-font text-center text-3xl text-primary-800">{appName}</h1>
		{#if loading}
			<div class="m-6 text-center">
				<p><Spinner /></p>
				{#if $loadingMessage}
					<p class="mt-2 text-xs text-gray-600">{$loadingMessage}</p>
				{/if}
			</div>
		{/if}
	{/if}
</main>
<Location {loading} update={() => update(false)} />
