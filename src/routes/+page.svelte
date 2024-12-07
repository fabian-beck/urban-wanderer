<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		coordinates,
		places,
		errorMessage,
		storyTexts,
		loadingMessage,
		audioState,
		preferences
	} from '../stores.js';
	import Header from '../components/Header.svelte';
	import Location from '../components/Position.svelte';
	import Nearby from '../components/Nearby.svelte';
	import Story from '../components/Story.svelte';
	import { Alert, CloseButton, Spinner, Toast } from 'flowbite-svelte';
	import { VolumeUpSolid } from 'flowbite-svelte-icons';
	import { appName } from '../constants.js';
	import Here from '../components/Here.svelte';
	import { onMount } from 'svelte';
	import History from '../components/History.svelte';

	let loading = false;

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

	onMount(() => {
		const urlParams = $page.url.searchParams;
		const lat = parseFloat(urlParams.get('lat'));
		const lon = parseFloat(urlParams.get('lon'));
		if (lat && lon) {
			update({ latitude: lat, longitude: lon });
		}
	});
</script>

<Header updateRandom={() => update('random')} />
<main id="main" class="mx-auto mb-10 max-w-lg p-4 pb-24 pt-20">
	{#if $errorMessage}
		<Alert type="danger" class="mb-4 flex text-xs">
			<div class="flex-auto overflow-hidden">
				{$errorMessage}
			</div>
			<CloseButton on:click={() => errorMessage.set(null)} class="flex-none" />
		</Alert>
	{/if}
	{#if !loading && $coordinates}
		<Here />
		<hr class="m-4" />
		<Nearby />
		<hr class="m-4" />
		<Story />
		<History />
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
{#if $preferences.audio}
	<Toast
		type="info"
		class="fixed left-0 top-0 m-1 h-12 transform"
		toastStatus={$audioState !== 'paused'}
		color="red"
		on:close={() => audioState.set('paused')}
	>
		<svelte:fragment slot="icon">
			{#if $audioState === 'loading'}
				<Spinner size="6" />
			{/if}
			{#if $audioState === 'playing'}
				<VolumeUpSolid />
			{/if}
		</svelte:fragment>
		Audio {$audioState}
	</Toast>
{/if}
