<script>
	import { Button } from 'flowbite-svelte';
	import { RefreshOutline, MapPinAltOutline } from 'flowbite-svelte-icons';
	import { coordinates } from '../stores.js';
	import { onMount } from 'svelte';

	export let loading = false;
	export let update;

	// format coordinates with N/S and E/W and degree symbols
	const formatCoordinates = (latitude, longitude) => {
		const lat = latitude >= 0 ? `${latitude.toFixed(4)}°N` : `${(-latitude).toFixed(4)}°S`;
		const lon = longitude >= 0 ? `${longitude.toFixed(4)}°E` : `${(-longitude).toFixed(4)}°W`;
		return `${lat}; ${lon}`;
	};

	let heading = 0;

	$: headingString = (() => {
		const directions = ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'];
		const index = Math.round(heading / 45) % 8;
		return directions[index];
	})();

	onMount(() => {
		window.addEventListener(
			'deviceorientationabsolute',
			(event) => {
				heading = event.alpha;
			},
			true
		);
	});
</script>

<div
	class="fixed bottom-0 left-0 right-0 m-2 flex min-h-10 items-center justify-center rounded-lg bg-gray-100 p-4"
>
	<div class="flex flex-auto">
		{#if $coordinates}
			<div class="text-xs">
				<div>
					<a
						href={`https://www.google.com/maps/search/?api=1&query=${$coordinates.latitude},${$coordinates.longitude}`}
						target="_blank"
						class="flex"
					>
						<MapPinAltOutline size="lg" class="mr-1" />{$coordinates.address} ({formatCoordinates(
							$coordinates.latitude,
							$coordinates.longitude
						)})
					</a>
				</div>
			</div>
		{:else if !loading}
			<i class="text-sm text-primary-800">Click the refresh button to get your location</i>
		{/if}
	</div>
	{#if $coordinates && headingString}
		<div class="w-20 text-center">{headingString}</div>
	{/if}
	<div class="ml-2 flex-none">
		<Button on:click={update} pill class="!p-2" disabled={loading}><RefreshOutline /></Button>
	</div>
</div>
