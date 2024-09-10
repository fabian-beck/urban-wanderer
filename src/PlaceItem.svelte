<script>
	import lang from './constants.js';
	import { FileOutline, MapPinAltOutline } from 'flowbite-svelte-icons';

	export let item;
</script>

{#if item}
	<div class="flex">
		<a
			href={`https://${lang}.m.wikipedia.org/?curid=${item.pageid}`}
			target="_blank"
			class="flex flex-auto"
		>
			<FileOutline class="!mr-2" />{item.title}
		</a>
		<a
			href={`https://www.google.com/maps/search/?api=1&query=${item.title}`}
			target="_blank"
			class="flex"
		>
			<span class="text-xs">
				{#if item.dist >= 50}
					{Math.floor(item.dist / 50) * 50}&nbsp;m
				{:else}
					here
				{/if}
			</span>
			<MapPinAltOutline />
		</a>
	</div>
{/if}
