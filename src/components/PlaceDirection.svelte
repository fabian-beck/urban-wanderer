<script>
	import { coordinates, heading } from '../stores.js';
	import { compassDirection, placeBearing } from '../util/map-excerpt.js';

	export let item;

	$: bearing = placeBearing(item, $coordinates);
	$: direction = bearing === null ? '' : compassDirection(bearing);

	// 'exact' when the place lies in the 45° sector the device points to, 'partial' for the
	// adjacent sectors
	$: directionMatch = (() => {
		if (bearing === null || $heading === undefined || $heading === null) return 'none';
		const sectorOf = (angle) => Math.round((((angle % 360) + 360) % 360) / 45) % 8;
		const diff = Math.abs(sectorOf(bearing) - sectorOf($heading));
		const shortestDiff = Math.min(diff, 8 - diff);
		if (shortestDiff === 0) return 'exact';
		if (shortestDiff === 1) return 'partial';
		return 'none';
	})();
</script>

{#if direction}
	<span
		class="text-xs {directionMatch === 'exact'
			? 'font-bold text-primary-800'
			: directionMatch === 'partial'
				? 'text-primary-800'
				: 'text-gray-400'}">{direction}</span
	>
{/if}
