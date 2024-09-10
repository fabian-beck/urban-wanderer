<script>
	import { Label, Range } from 'flowbite-svelte';
	import { radius } from './stores.js';

	export let updateArticles;
</script>

<div>
	<Label>Search radius ({$radius}&nbsp;m)</Label>
	<Range
		id="range1"
		bind:value={$radius}
		min="100"
		max="3000"
		step="100"
		on:change={updateArticles}
	/>
</div>
