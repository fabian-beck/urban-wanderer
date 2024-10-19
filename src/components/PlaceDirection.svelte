<script>
	import { onMount } from 'svelte';
	import { coordinates } from '../stores.js';

	export let item;

	// derived property: direction (e.g., N, NW, SE, etc.) computed from difference between user's location and item's location
	$: direction = (() => {
		if (item.lat && item.lon) {
			const lat = $coordinates.latitude;
			const lon = $coordinates.longitude;
			const dLat = item.lat - lat;
			const dLon = item.lon - lon;
			if (dLat === 0 && dLon === 0) {
				return '';
			}
			const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI + 360;
			const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
			const index = Math.round(angle / 45) % 8;
			return directions[index];
		}
		return '';
	})();
</script>

{#if direction}
	<span class="text-xs text-primary-800">{direction}</span>
{/if}
