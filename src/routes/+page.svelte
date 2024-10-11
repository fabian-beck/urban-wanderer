<script>
	import { coordinates, places, errorMessage, storyTexts, loadingMessage } from '../stores.js';
	import Header from '../components/Header.svelte';
	import Location from '../components/Position.svelte';
	import Nearby from '../components/Nearby.svelte';
	import Story from '../components/Story.svelte';
	import { Alert, CloseButton, Spinner } from 'flowbite-svelte';
	import { appName } from '../constants.js';
	import Here from '../components/Here.svelte';

	let loading = false;

	const update = async (random = false) => {
		try {
			errorMessage.set(null);
			loading = true;
			places.reset();
			coordinates.reset();
			$storyTexts = [];
			loadingMessage.set('Updating location...');
			await coordinates.update(random);
			await places.update();
			loading = false;
			loadingMessage.set(null);
		} catch (error) {
			loading = false;
			errorMessage.set('Error updating location: ' + error);
			console.error('Error updating location', error);
		}
	};
</script>

<Header updateRandom={() => update(true)} />
<main id="main" class="mb-10 p-4 py-20">
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
