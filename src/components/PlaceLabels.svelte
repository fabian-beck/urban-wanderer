<script>
	import { preferences } from '../stores.js';
	import { LABELS } from '../constants/ui-config.js';

	export let labels = [];
	export let matchingOnly = false;

	const getLabelName = (labelValue) =>
		LABELS.find((label) => label.value === labelValue)?.name || null;

	$: visibleLabels = (labels || [])
		.filter((label) => getLabelName(label) !== null)
		.filter((label) => !matchingOnly || $preferences.labels?.includes(label))
		.sort((a, b) => {
			const aMatches = $preferences.labels?.includes(a);
			const bMatches = $preferences.labels?.includes(b);
			if (aMatches && !bMatches) return -1;
			if (!aMatches && bMatches) return 1;
			return 0;
		});
</script>

{#if visibleLabels.length > 0}
	<div class="flex flex-wrap">
		{#each visibleLabels as label}
			<div
				class={$preferences.labels?.includes(label)
					? 'mb-1 mr-2 rounded-full bg-primary-100 px-2 text-sm text-primary-800'
					: 'mb-1 mr-2 rounded-full bg-gray-100 px-2 text-sm text-gray-600'}
			>
				{getLabelName(label)}
			</div>
		{/each}
	</div>
{/if}
