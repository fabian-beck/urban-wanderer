<script>
	import { afterUpdate } from 'svelte';
	import { Label, Range, Checkbox, Modal, Select, Toggle, Button } from 'flowbite-svelte';
	import { preferences } from '../stores.js';
	import { places } from '../stores.js';
	import {
		LABELS,
		LANGUAGES,
		GUIDE_CHARACTERS,
		FAMILIARITY,
		AI_MODELS
	} from '../constants/ui-config.js';
	import { clearAnalysisCache } from '../util/ai-analysis.js';
	import { clearInsightsCache, clearFactsCache } from '../util/ai-facts.js';
	import { clearOsmCache } from '../util/osm.js';
	import { clearDebugConsole, debugLogs } from '../util/debug-console.js';

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
	let debugLogPanel;
	let previousDebugVisible = false;
	let previousLogCount = 0;

	afterUpdate(() => {
		const shouldScroll =
			debugLogPanel &&
			$preferences.debug &&
			($debugLogs.length !== previousLogCount || !previousDebugVisible);

		previousDebugVisible = $preferences.debug;
		previousLogCount = $debugLogs.length;

		if (shouldScroll) {
			debugLogPanel.scrollTop = debugLogPanel.scrollHeight;
		}
	});

	function handleClearCache() {
		clearAnalysisCache();
		clearInsightsCache();
		clearFactsCache();
		clearOsmCache();
		cacheCleared = true;
		setTimeout(() => {
			cacheCleared = false;
		}, 3000);
	}
</script>

<Modal title="Preferences" bind:open={visible} autoclose on:close={places.update}>
	<h3 class="mb-4 border-b pb-2 text-lg font-semibold">Personalization</h3>
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
	<Label>Familiarity with the area</Label>
	<Select bind:value={$preferences.familiarity} items={FAMILIARITY} />
	<Label>Guide character</Label>
	<Select bind:value={$preferences.guideCharacter} items={characterOptions} />

	<h3 class="mb-4 mt-8 border-b pb-2 text-lg font-semibold">Language</h3>
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

	<h3 class="mb-4 mt-8 border-b pb-2 text-lg font-semibold">Discovery</h3>
	<Label>Search radius ({$preferences.radius}&nbsp;m)</Label>
	<Range id="range1" bind:value={$preferences.radius} min="100" max="3000" step="100" />
	<Label>Audio (autoplay)</Label>
	<Toggle bind:checked={$preferences.audio} />

	<h3 class="mb-4 mt-8 border-b pb-2 text-lg font-semibold">AI</h3>
	<Label>AI Model for Simple Tasks</Label>
	<Select bind:value={$preferences.aiModelSimple} items={AI_MODELS.SIMPLE} />
	<Label>AI Model for Advanced Tasks</Label>
	<Select bind:value={$preferences.aiModelAdvanced} items={AI_MODELS.ADVANCED} />

	<div class="mt-6 border-t border-gray-200 pt-4">
		<Label>Cache Management</Label>
		<div class="mb-2 text-xs text-gray-500">Clear cached data to force fresh generation.</div>
		<Button
			color={cacheCleared ? 'green' : 'alternative'}
			size="sm"
			on:click={handleClearCache}
			disabled={cacheCleared}
		>
			{cacheCleared ? '✓ Caches Cleared!' : 'Clear Cached Data'}
		</Button>
	</div>

	<div class="mt-6 border-t border-gray-200 pt-4">
		<div class="flex items-center justify-between gap-4">
			<Label>Debug mode</Label>
			<Toggle bind:checked={$preferences.debug} />
		</div>

		{#if $preferences.debug}
			<div class="mt-4 flex items-center justify-between gap-4">
				<Label>Console logs ({$debugLogs.length})</Label>
				<Button color="alternative" size="xs" on:click={clearDebugConsole}>Clear</Button>
			</div>
			<div
				bind:this={debugLogPanel}
				class="mt-2 max-h-80 overflow-auto rounded border border-gray-200 bg-gray-950 p-3 font-mono text-xs text-gray-100"
			>
				{#if $debugLogs.length}
					{#each $debugLogs as log (log.id)}
						<div class="mb-2 border-b border-gray-800 pb-2 last:mb-0 last:border-b-0 last:pb-0">
							<span class="text-gray-400">{log.timestamp}</span>
							<span
								class={log.level === 'error'
									? 'text-red-300'
									: log.level === 'warn'
										? 'text-yellow-300'
										: 'text-blue-300'}>[{log.level}]</span
							>
							<span class="whitespace-pre-wrap break-words">{log.message}</span>
						</div>
					{/each}
				{:else}
					<div class="text-gray-400">No logs yet.</div>
				{/if}
			</div>
		{/if}
	</div>
</Modal>
