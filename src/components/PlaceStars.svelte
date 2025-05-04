<script>
	import { StarSolid } from 'flowbite-svelte-icons';
	export let item;
	export let detail = false;
</script>

<div class="mt-1 flex text-left text-xs {detail ? 'flex-col' : 'h-5'}">
	{#if item.starDescriptions?.length > 0}
		{#each item.starDescriptions as starDescription}
			<div class="flex">
				{#each Array(starDescription.number) as _}
					<StarSolid size="xs" class="text-primary-800" />
				{/each}
				{#if detail}
					<div class="ml-2">{starDescription.text}</div>
				{/if}
			</div>
		{/each}
	{:else}
		...
	{/if}
</div>
