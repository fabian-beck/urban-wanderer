<script>
	import { coordinates, places, errorMessage, storyText } from '../stores.js';
	import Header from '../Header.svelte';
	import Location from '../Location.svelte';
	import PlacesList from '../PlacesList.svelte';
	import Story from '../Story.svelte';
	import { Alert, CloseButton, Spinner } from 'flowbite-svelte';
	import { appName } from '../constants.js';
	import { writable } from 'svelte/store';

	let loading = false;

	const update = async () => {
		try {
			loading = true;
			places.reset();
			coordinates.reset();
			$storyText = null;
			await coordinates.update();
			await places.update();
			loading = false;
		} catch (error) {
			console.error('Error getting current position', error);
		}
	};
</script>

<Header />
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
		<PlacesList {loading} />
		<hr class="m-4" />
		<Story />
	{:else}
		<div class="m-6 mt-20 flex justify-center">
			<img src="urban-wanderer-icon.png" alt="logo" class="w-24" />
		</div>
		<h1 class="uw-font text-center text-3xl text-primary-800">{appName}</h1>
		{#if loading}
			<div class="m-6 flex justify-center">
				<Spinner />
			</div>
		{/if}
	{/if}
</main>
<Location {loading} {update} />
