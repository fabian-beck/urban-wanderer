<script>
	import { Label, Range, Checkbox, Modal, Select, Toggle, Button } from 'flowbite-svelte';
	import { preferences } from '../stores.js';
	import { places } from '../stores.js';
	import { LABELS, LANGUAGES, GUIDE_CHARACTERS, FAMILIARITY, AI_MODELS } from '../constants.js';
	import { clearAnalysisCache } from '../util/ai-analysis.js';

	export let visible = false;
	const langOptions = [
		{ value: 'en', name: 'English' },
		{ value: 'de', name: 'German' }
	];
	const characterOptions = GUIDE_CHARACTERS.map((character) => ({
		value: character,
		name: character
	}));

	let cacheCleared = false;
	
	function handleClearCache() {
		clearAnalysisCache();
		cacheCleared = true;
		// Reset the feedback after 3 seconds
		setTimeout(() => {
			cacheCleared = false;
		}, 3000);
	}
</script>

<Modal title="Preferences" bind:open={visible} autoclose on:close={places.update}>
	<Label>My Interests</Label>
	<div class="grid grid-cols-2 gap-4">
		{#each LABELS as label}
			<Checkbox
				id={label.value}
				checked={$preferences.labels?.includes(label.value)}
				on:change={() => {
					if ($preferences.labels?.includes(label.value)) {
						$preferences.labels = $preferences.labels.filter((l) => l !== label.value);
					} else {
						$preferences.labels = [...$preferences.labels, label.value];
					}
				}}
			>
				<div>
					<div class="font-bold">{label.name}</div>
					<div class="text-xs text-gray-500">{label.description}</div>
				</div>
			</Checkbox>
		{/each}
	</div>
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
	<Label>Audio (autoplay)</Label>
	<Toggle bind:checked={$preferences.audio} />
	<Label>AI Model for Simple Tasks</Label>
	<Select bind:value={$preferences.aiModelSimple} items={AI_MODELS.SIMPLE} />
	<Label>AI Model for Advanced Tasks</Label>
	<Select bind:value={$preferences.aiModelAdvanced} items={AI_MODELS.ADVANCED} />
	
	<div class="mt-6 pt-4 border-t border-gray-200">
		<Label>Cache Management</Label>
		<div class="text-xs text-gray-500 mb-2">
			Clear cached place analysis data to force re-analysis of all places.
		</div>
		<Button 
			color={cacheCleared ? "green" : "alternative"} 
			size="sm" 
			on:click={handleClearCache}
			disabled={cacheCleared}
		>
			{cacheCleared ? "✓ Cache Cleared!" : "Clear Analysis Cache"}
		</Button>
	</div>
</Modal>
