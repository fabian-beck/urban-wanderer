<script>
	import { marked } from 'marked';

	export let label = 'Label';
	export let value = 'Value';
	export let widthClass = 'col-span-1'; // quarter, half, or full width - controlled by parent
</script>

<div
	class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center shadow-sm {widthClass}"
>
	<span class="mb-0.5 text-xs font-medium leading-tight text-gray-600">{label}</span>
	<span
		class="text-center font-semibold leading-tight text-gray-900"
		class:text-base={value?.toString().length < 10}
		class:text-sm={value?.toString().length >= 10}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html marked(typeof value === 'number' ? value.toString() : value)}
	</span>
</div>