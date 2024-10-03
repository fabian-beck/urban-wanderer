<script>
	import PlaceDetails from './PlaceDetails.svelte';
	import { StarSolid } from 'flowbite-svelte-icons';
	import { preferences } from '../stores.js';

	export let item;
	export let showDistance = false;
	export let hideRating = false;
	let detailsVisible = false;
</script>

{#if item}
	<button
		on:click={() => {
			detailsVisible = true;
		}}
		class="w-full"
	>
		<div class="flex">
			<div class="flex flex-auto overflow-hidden text-left">
				<span class="text-m mr-lg text-lg"
					>{item.title}
					{#if item.type === 'address'}🏙️
					{:else if item.type === 'river' || item.type === 'stream'}🌊
					{:else if item.type === 'monument' || item.type === 'memorial' || item.type === 'museum' || item.type === 'library'}🏛️
					{:else if item.type === 'university' || item.type === 'college' || item.type === 'school'}🎓
					{:else if item.type === 'tomb'}🪦
					{:else if item.type === 'place_of_worship'}⛪
					{:else if item.type === 'castle'}🏰
					{:else if item.type === 'park' || item.type === 'nature_reserve'}🌳
					{:else if item.type === 'attraction'}🎡
					{:else if item.type === 'communications_tower'}🗼
					{:else if item.type === 'stadium' || item.type === 'sports_centre'}⚽
					{:else if item.type === 'artwork' || item.type === 'statue'}🗽
					{:else if item.type === 'ruins'}🏚️
					{:else if item.type === 'gallery'}🖼️
					{:else if item.type}
						({item.type})
					{/if}
				</span>
			</div>
			{#if showDistance}
				<span class="text-right text-xs">
					{#if item.dist >= 50}
						{Math.floor(item.dist / 50) * 50}&nbsp;m
					{:else}
						here
					{/if}
				</span>
			{/if}
		</div>
		{#if !hideRating}
			<div class="mt-1 flex text-left text-xs">
				{#if item.wikipedia || item.pageid}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
				{#if item.labels && item.labels.some((label) => $preferences.labels.includes(label))}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
				{#if item.rating > 3}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
				{#if item.rating > 4}
					<StarSolid size="xs" class="text-primary-800" />
				{/if}
			</div>
		{/if}
	</button>
	<PlaceDetails bind:visible={detailsVisible} {item} />
{/if}
