<script>
	import { Label, Range } from 'flowbite-svelte';
	import { preferences } from './stores.js';
	import { places } from './stores.js';
	import { LABELS } from './constants.js';
</script>

<div>
	<div class="mb-2 flex">
		<h2 class="flex-auto text-lg">My Preferences</h2>
	</div>
	<Label>Search radius ({$preferences.radius}&nbsp;m)</Label>
	<Range
		id="range1"
		bind:value={$preferences.radius}
		min="100"
		max="3000"
		step="100"
		on:change={places.update}
	/>
	<Label>My Interests</Label>
	{#each LABELS as label}
		<Label>
			<input
				type="checkbox"
				value={label}
				checked={$preferences.labels?.includes(label)}
				on:change={() => {
					if ($preferences.labels?.includes(label)) {
						$preferences.labels = $preferences.labels.filter((l) => l !== label);
					} else {
						$preferences.labels = [...$preferences.labels, label];
					}
					console.log($preferences.labels);
				}}
			/>
			{label}
		</Label>
	{/each}
</div>
