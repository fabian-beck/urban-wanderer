<script>
	import { coordinates, places, errorMessage, storyTexts, osmPlaces } from '../stores.js';
	import Header from '../components/Header.svelte';
	import Location from '../components/Position.svelte';
	import Nearby from '../components/Nearby.svelte';
	import Story from '../components/Story.svelte';
	import { Alert, CloseButton, Spinner } from 'flowbite-svelte';
	import { appName } from '../constants.js';
	import Here from '../components/Here.svelte';

	let loading = false;

	const update = async () => {
		try {
			loading = true;
			places.reset();
			coordinates.reset();
			$storyTexts = [];
			await coordinates.update();
			await places.update();
			await osmPlaces.update();
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
			<div class="m-6 flex justify-center">
				<Spinner />
			</div>
		{/if}
	{/if}
</main>
<Location {loading} {update} />
