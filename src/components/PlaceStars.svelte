<script>
	import { StarSolid } from 'flowbite-svelte-icons';
	export let item;
	export let detail = false;

	const getStarColor = (starIndex) => {
		switch(starIndex) {
			case 0: return 'text-[#FE795D]';
			case 1: return 'text-[#EF562F]';
			case 2: return 'text-[#EB4F27]';
			case 3: return 'text-[#CC4522]';
			default: return 'text-[#A5371B]';
		}
	};
</script>

<div class="mt-1 flex text-left text-xs {detail ? 'flex-col' : 'h-5'}">
	{#if item.starDescriptions?.length > 0}
		{@const allStars = item.starDescriptions.reduce((acc, desc) => acc + desc.number, 0)}
		{#each item.starDescriptions as starDescription, groupIndex}
			{@const starOffset = item.starDescriptions.slice(0, groupIndex).reduce((acc, desc) => acc + desc.number, 0)}
			<div class="flex">
				<!-- eslint-disable-next-line no-unused-vars -->
				{#each Array(starDescription.number).fill() as _, localIndex}
					<StarSolid size="xs" class="{getStarColor(starOffset + localIndex)}" />
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
