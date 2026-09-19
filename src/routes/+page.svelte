<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		coordinates,
		errorMessage,
		loadingMessage,
		heading,
		updateLocation,
		searchForPlace,
		beginWalk,
		loading
	} from '../stores.js';
	import Header from '../components/Header.svelte';
	import Location from '../components/Position.svelte';
	import Nearby from '../components/Nearby.svelte';
	import Alert from 'flowbite-svelte/Alert.svelte';
	import Button from 'flowbite-svelte/Button.svelte';
	import CloseButton from 'flowbite-svelte/CloseButton.svelte';
	import Spinner from 'flowbite-svelte/Spinner.svelte';
	import { appName } from '../constants/core.js';
	import Here from '../components/Here.svelte';
	import { onMount } from 'svelte';
	import Map from '../components/Map.svelte';
	import Comment from '../components/Comment.svelte';
	import UserPreferences from '../components/UserPreferences.svelte';
	import WalkResumeModal from '../components/WalkResumeModal.svelte';
	import { TrackingOutline } from 'flowbite-svelte-icons';
	import { preferences } from '../stores.js';
	import { LABELS, FAMILIARITY, LANGUAGES } from '../constants/ui-config.js';

	$: familiarityLabel =
		FAMILIARITY.find((f) => f.value === $preferences.familiarity)?.name || $preferences.familiarity;
	$: languageLabel =
		LANGUAGES.find((l) => l.value === $preferences.lang)?.name || $preferences.lang;

	let preferencesVisible = false;

	let urlCoordinates = null;
	let urlUpdateTimeout = null;

	// Update URL params when coordinates change (debounced)
	function scheduleUrlUpdate(currentCoordinates) {
		clearTimeout(urlUpdateTimeout);
		urlUpdateTimeout = setTimeout(() => {
			const newUrl = new URL($page.url);
			const currentLat = newUrl.searchParams.get('lat');
			const currentLon = newUrl.searchParams.get('lon');
			const newLat = currentCoordinates.latitude.toString();
			const newLon = currentCoordinates.longitude.toString();

			// Only update URL if coordinates actually changed
			if (currentLat !== newLat || currentLon !== newLon) {
				newUrl.searchParams.set('lat', newLat);
				newUrl.searchParams.set('lon', newLon);
				goto(resolve(`/${newUrl.search}`), { replaceState: true, noScroll: true });
			}
		}, 500);
	}

	$: if ($coordinates) {
		scheduleUrlUpdate($coordinates);
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
		{#if $loading}
			<div class="m-6 text-center">
				<p><Spinner /></p>
				{#if $loadingMessage}
					<p class="mt-2 text-xs text-gray-600">{$loadingMessage}</p>
				{/if}
			</div>
		{:else}
			<div class="mx-6 mt-6 text-center">
				<p class="mb-3 text-sm text-gray-600">
					Start a walk to discover the places around you. Your guide keeps track of your stops and
					the stories you read.
				</p>
				<div class="flex justify-center gap-2">
					<Button color="alternative" on:click={() => (preferencesVisible = true)}>
						Preferences
					</Button>
					<Button on:click={beginWalk}><TrackingOutline class="mr-2" />Start walk</Button>
				</div>
				<p class="mt-4 text-xs text-gray-500">
					Interests: {LABELS.filter((label) => $preferences.labels.includes(label.value))
						.map((label) => label.name.split(' ')[0])
						.join(' ')}, Familiarity: <strong>{familiarityLabel}</strong>, Guide:
					<strong>{$preferences.guideCharacter}</strong>, Language:
					<strong>{languageLabel}</strong>, Radius: <strong>{$preferences.radius}m</strong>
				</p>
			</div>
		{/if}
	{/if}
</main>
{#if $coordinates}
	<Location loading={$loading} update={() => updateLocation(false)} />
{/if}
<UserPreferences bind:visible={preferencesVisible} />
<WalkResumeModal />
