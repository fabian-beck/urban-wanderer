<script>
	import { Label, Range, Checkbox, Modal, Select, Toggle } from 'flowbite-svelte';
	import { preferences } from '../stores.js';
	import { places } from '../stores.js';
	import { LABELS, LANGUAGES, GUIDE_CHARACTERS, FAMILIARITY } from '../constants.js';

	export let visible = false;
	const langOptions = [
		{ value: 'en', name: 'English' },
		{ value: 'de', name: 'German' }
	];
	const characterOptions = GUIDE_CHARACTERS.map((character) => ({
		value: character,
		name: character
	}));
</script>

<Modal title="Preferences" bind:open={visible} autoclose on:close={places.update}>
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
	<Label>Guide character</Label>
	<Select bind:value={$preferences.guideCharacter} items={characterOptions} />
	<Label>Familiarity with the area</Label>
	<Select bind:value={$preferences.familiarity} items={FAMILIARITY} />
	<Label>Content presentation language</Label>
	<Select bind:value={$preferences.lang} items={langOptions} />
	<Label>Content source languages</Label>
	{#each LANGUAGES as lang}
		<Checkbox
			id={lang.value}
			checked={$preferences.sourceLanguages?.includes(lang.value)}
			on:change={() => {
				if (!$preferences.sourceLanguages) {
					$preferences.sourceLanguages = [];
				}
				if ($preferences.sourceLanguages?.includes(lang.value)) {
					$preferences.sourceLanguages = $preferences.sourceLanguages.filter(
						(l) => l !== lang.value
					);
				} else {
					$preferences.sourceLanguages = [...$preferences.sourceLanguages, lang.value];
				}
			}}
		>
			{lang.name}
		</Checkbox>
	{/each}
	<Label>Search radius ({$preferences.radius}&nbsp;m)</Label>
	<Range id="range1" bind:value={$preferences.radius} min="100" max="3000" step="100" />
	<!-- Audio on/off toggle -->
	<Label>Audio (speech synthesis)</Label>
	<Toggle bind:checked={$preferences.audio} />
</Modal>
