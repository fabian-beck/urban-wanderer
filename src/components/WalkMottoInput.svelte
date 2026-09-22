<script>
	import Label from 'flowbite-svelte/Label.svelte';
	import Textarea from 'flowbite-svelte/Textarea.svelte';
	import { WALK_MOTTO_MAX_LENGTH } from '../constants/core.js';

	export let value = '';
	export let id = 'walk-motto';
	export let label = 'Motto for this walk (optional)';
	export let compact = false;
</script>

<div class={compact ? '' : 'text-left'}>
	{#if label}
		<Label for={id} class="mb-1 text-xs text-gray-600">{label}</Label>
	{/if}
	<Textarea
		{id}
		bind:value
		rows={compact ? 2 : 3}
		maxlength={WALK_MOTTO_MAX_LENGTH}
		placeholder="e.g. Explain everything in depth and detail. Or: Tell me the background stories and the people behind the places."
		class="text-sm"
	/>
	<div class="mt-1 text-right text-xs text-gray-400">
		{value?.length || 0}/{WALK_MOTTO_MAX_LENGTH}
	</div>
</div>
