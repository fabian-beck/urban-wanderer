<script>
	import { Label, Range, Checkbox, Modal } from 'flowbite-svelte';
	import { preferences } from '../stores.js';
	import { places } from '../stores.js';
	import { LABELS } from '../constants.js';

	export let visible = false;
</script>

<Modal title="Preferences" bind:open={visible} autoclose on:close={places.update}>
	<Label>Search radius ({$preferences.radius}&nbsp;m)</Label>
	<Range id="range1" bind:value={$preferences.radius} min="100" max="3000" step="100" />
	<Label>My Interests</Label>
	{#each LABELS as label}
		<Checkbox
			id={label}
			checked={$preferences.labels?.includes(label)}
			on:change={() => {
				if ($preferences.labels?.includes(label)) {
					$preferences.labels = $preferences.labels.filter((l) => l !== label);
				} else {
					$preferences.labels = [...$preferences.labels, label];
				}
			}}
		>
			{label}
		</Checkbox>
	{/each}
</Modal>
