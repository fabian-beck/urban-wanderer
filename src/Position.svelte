<script>
	import { Button, Spinner } from 'flowbite-svelte';
	import { RefreshOutline, MapPinAltOutline } from 'flowbite-svelte-icons';
	import { coordinates } from './stores.js';

	export let loading = false;
	export let update;
</script>

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
