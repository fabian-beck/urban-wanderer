<script>
	import { StarSolid } from 'flowbite-svelte-icons';
	import { preferences } from '../stores.js';
	export let item;
	export let detail = false;

	// Filter labels that match the user's preferences; if labels are undefined, set to empty array
	$: matchingLabels = item?.labels
		? item.labels.filter((label) => $preferences.labels.includes(label))
		: [];
</script>

<div class="mt-1 flex text-left text-xs {detail ? 'flex-col' : 'h-5'}">
	{#if item.importance}
		{#if item.wikipedia || item.pageid}
			<div class="flex">
				<StarSolid size="xs" class="text-primary-800" />
				{#if detail}
					<div class="ml-2">has a Wikipedia page</div>
				{/if}
			</div>
		{/if}
		{#if matchingLabels.length > 0}
			<div class="flex">
				<StarSolid size="xs" class="text-primary-800" />
				{#if matchingLabels.length > 1}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
				{#if detail}
					<div class="ml-2">
						matches your preferences {matchingLabels.length > 1 ? 'very well' : ''}
					</div>
				{/if}
			</div>
		{/if}
		{#if item.importance > 3}
			<div class="flex">
				<StarSolid size="xs" class="text-primary-800" />
				{#if item.importance > 4}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
				{#if detail}
					<div class="ml-2">
						has a {item.importance > 4 ? 'very ' : ' '}high importance for the location
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		...
	{/if}
</div>
