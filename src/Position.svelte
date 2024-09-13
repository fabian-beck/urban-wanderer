<script>
	import { Button, Spinner } from 'flowbite-svelte';
	import { RefreshOutline, MapPinAltOutline } from 'flowbite-svelte-icons';
	import { coordinates } from './stores.js';

	export let loading = false;
	export let update;

	// format coordinates with N/S and E/W and degree symbols
	const formatCoordinates = (latitude, longitude) => {
		const lat = latitude >= 0 ? `${latitude.toFixed(4)}°N` : `${(-latitude).toFixed(4)}°S`;
		const lon = longitude >= 0 ? `${longitude.toFixed(4)}°E` : `${(-longitude).toFixed(4)}°W`;
		return `${lat}; ${lon}`;
	};
</script>

<div class="flex">
	<div class="flex-auto">
		<h2 class="text-lg">My Position</h2>
		<div class="min-h-6">
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
							>
								<MapPinAltOutline size="sm" class="mr-1" />{$coordinates.address} ({formatCoordinates(
									$coordinates.latitude,
									$coordinates.longitude
								)})
							</a>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<div class="ml-4 flex-none">
		<Button on:click={update} pill class="!p-2"><RefreshOutline /></Button>
	</div>
</div>
