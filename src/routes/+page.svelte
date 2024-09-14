<script>
	import { coordinates, places, errorMessage } from '../stores.js';
	import Header from '../Header.svelte';
	import Position from '../Position.svelte';
	import PlacesList from '../PlacesList.svelte';
	import Story from '../Story.svelte';
	import { Alert, CloseButton } from 'flowbite-svelte';

	let loading = false;

	const update = async () => {
		try {
			loading = true;
			places.reset();
			coordinates.reset();
			await coordinates.update();
			await places.update();
			loading = false;
		} catch (error) {
			console.error('Error getting current position', error);
		}
	};
</script>

<Header />
<main id="main" class="p-4 pt-20">
	{#if $errorMessage}
		<Alert type="danger" class="mb-4 flex text-xs">
			<div class="flex-auto overflow-hidden">
				{$errorMessage}
			</div>
			<CloseButton on:click={() => errorMessage.set(null)} class="flex-none" />
		</Alert>
	{/if}
	<Position {loading} {update} />
	{#if $coordinates}
		<hr class="m-4" />
		<PlacesList {loading} />
		<hr class="m-4" />
		<Story />
	{/if}
</main>
