<script>
	import { CLASSES } from '../constants.js';
	export let place;
</script>

{place.title}&nbsp;{#if place.cls}
	{#if CLASSES[place.cls]?.emoji}
		{CLASSES[place.cls]?.emoji}
	{:else}
		<span class="text-xs">{place.cls}</span>
	{/if}
{/if}
