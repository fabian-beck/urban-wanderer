<script>
	import { CLASSES } from '../constants/place-classes.js';
	export let place;
</script>

<span class="place-title">
	{#if place.cls}
		{#if CLASSES[place.cls]?.emoji}
			<span class="place-title-icon">{CLASSES[place.cls]?.emoji}</span>
		{:else}
			<span class="text-xs">{place.cls}</span>
		{/if}
	{/if}
	<span class="font-bold">{place.title}</span>
</span>

<style>
	.place-title {
		display: inline-flex;
		align-items: baseline;
		gap: 0.25rem;
	}

	.place-title-icon {
		font-size: 1.15em;
		line-height: 1;
	}
</style>
