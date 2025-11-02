<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		coordinates,
		errorMessage,
		loadingMessage,
		heading,
		updateLocation,
		searchForPlace,
		loading
	} from '../stores.js';
	import Header from '../components/Header.svelte';
	import Location from '../components/Position.svelte';
	import Nearby from '../components/Nearby.svelte';
	import { Alert, CloseButton, Spinner, Button } from 'flowbite-svelte';
	import { appName } from '../constants/core.js';
	import Here from '../components/Here.svelte';
	import { onMount } from 'svelte';
	import Map from '../components/Map.svelte';
	import Comment from '../components/Comment.svelte';
	import UserPreferences from '../components/UserPreferences.svelte';

	export let params = {};

	let preferencesVisible = false;

	let urlCoordinates = null;
	let urlUpdateTimeout = null;

	// Update URL params when coordinates change (debounced)
	$: if ($coordinates) {
		if (urlUpdateTimeout) {
			clearTimeout(urlUpdateTimeout);
		}
		urlUpdateTimeout = setTimeout(() => {
			const newUrl = new URL($page.url);
			const currentLat = newUrl.searchParams.get('lat');
			const currentLon = newUrl.searchParams.get('lon');
			const newLat = $coordinates.latitude.toString();
			const newLon = $coordinates.longitude.toString();

			// Only update URL if coordinates actually changed
			if (currentLat !== newLat || currentLon !== newLon) {
				newUrl.searchParams.set('lat', newLat);
				newUrl.searchParams.set('lon', newLon);
				goto(newUrl.toString(), { replaceState: true, noScroll: true });
			}
		}, 500);
	}

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

<Header updateRandom={() => updateLocation('random')} {searchForPlace} />
<main id="main" class="mx-auto mb-10 max-w-lg p-4 pb-24 pt-20">
	{#if urlCoordinates}
		<div class="mb-4">
			<Button
				on:click={() => {
					updateLocation(urlCoordinates);
					urlCoordinates = null;
				}}
				class="w-full"
			>
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
	{#if !$loading && $coordinates}
		<Map />
		<hr class="m-4" />
		<Comment />
		<hr class="m-4" />
		<Here />
		<hr class="m-4" />
		<Nearby />
	{:else}
		<div class="m-6 mt-20 flex justify-center">
			<img src="urban-wanderer-icon.png" alt="logo" class="w-24" />
		</div>
		<h1 class="uw-font text-center text-3xl text-primary-800">{appName}</h1>
		<div class="mx-6 mt-6 text-center">
			<p class="mb-3 text-sm text-gray-600">To personalize the guide, set your preferences.</p>
			<Button on:click={() => (preferencesVisible = true)}>Open Preferences</Button>
		</div>
		{#if $loading}
			<div class="m-6 text-center">
				<p><Spinner /></p>
				{#if $loadingMessage}
					<p class="mt-2 text-xs text-gray-600">{$loadingMessage}</p>
				{/if}
			</div>
		{/if}
	{/if}
</main>
<Location loading={$loading} update={() => updateLocation(false)} />
<UserPreferences bind:visible={preferencesVisible} />
