<script>
	import { marked } from 'marked';

	export let label = 'Label';
	export let value = 'Value';
</script>

<div
	class="mb-1 mr-2 flex max-w-[45%] flex-col items-center justify-center rounded bg-gray-100 px-2 text-center"
>
	<span class="text-xs">{label}:</span>
	<span class="ml-1 text-gray-800" class:text-xl={value?.toString().length < 15}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html marked(typeof value === 'number' ? value.toString() : value)}
	</span>
</div>
