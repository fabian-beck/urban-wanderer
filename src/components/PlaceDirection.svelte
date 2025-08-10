<script>
	import { coordinates, heading } from '../stores.js';

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

	// Calculate direction matching level: 'exact', 'partial', or 'none'
	$: directionMatch = (() => {
		if (!direction || $heading === undefined) return 'none';
		
		const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
		const placeIndex = directions.indexOf(direction);
		const headingIndex = Math.round($heading / 45) % 8;
		
		// Calculate the shortest angular distance between directions
		const diff = Math.abs(placeIndex - headingIndex);
		const shortestDiff = Math.min(diff, 8 - diff); // Handle wrap-around
		
		if (shortestDiff === 0) return 'exact';     // Same direction (0°)
		if (shortestDiff === 1) return 'partial';   // Adjacent direction (±45°)
		return 'none';                              // Further away (±90° or more)
	})();
</script>

{#if direction}
	<span class="text-xs {directionMatch === 'exact' ? 'text-primary-800 font-bold' : directionMatch === 'partial' ? 'text-primary-800' : 'text-gray-400'}">{direction}</span>
{/if}
