<script>
	import { Button } from 'flowbite-svelte';
	import { ArrowRightOutline } from 'flowbite-svelte-icons';
	import PlaceFact from './PlaceFact.svelte';
	import { searchPlaceFacts } from '../util/ai.js';
	import { Spinner } from 'flowbite-svelte';
	import { CLASSES, PROPERTIES, PROPERTY_TRANSLATIONS } from '../constants.js';
	import { preferences } from '../stores.js';
	import { get } from 'svelte/store';

	export let place;

	let facts = null;
	let factsLoading = false;

	const loadFacts = async () => {
		factsLoading = true;

		const factsProperties = {
			other_facts: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						label: {
							type: 'string',
							description: 'short label for the fact'
						},
						description: {
							type: 'string',
							description: 'the fact itself, described as short as possible, max 30 characters'
						}
					},
					required: ['label', 'description'],
					additionalProperties: false,
					description:
						'list of additional facts (max 5 facts); no redundancies, no links; keep the list short and concise'
				}
			}
		};

		const classProperties = CLASSES[place.cls]?.properties || [];
		for (const prop of classProperties) {
			if (PROPERTIES[prop]) {
				factsProperties[prop] = PROPERTIES[prop];
			}
		}

		facts = await searchPlaceFacts(place, factsProperties);
		factsLoading = false;
	};

	function formatLabel(key) {
		const $language = get(preferences).lang;
		if (PROPERTY_TRANSLATIONS[key] && PROPERTY_TRANSLATIONS[key][$language]) {
			return PROPERTY_TRANSLATIONS[key][$language];
		}
		return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
	}
</script>

<div>
	<div class="flex flex-auto">
		{#if !facts}
			{#if factsLoading}
				<div class="m-6 flex justify-center">
					<Spinner size="6" />
				</div>
			{:else}
				<Button on:click={loadFacts} pill size="xs" outline class="mt-2"
					><ArrowRightOutline />
					Search for facts
				</Button>
			{/if}
		{:else}
			<div class="flex flex-wrap items-center justify-center gap-1">
				{#each Object.entries(facts) as [key, value]}
					{#if key !== 'other_facts' && value && PROPERTIES[key]}
						{@const propDefinition = PROPERTIES[key]}
						{#if propDefinition.type === 'array'}
							{#if Array.isArray(value) && value.length > 0}
								<PlaceFact label={formatLabel(key)} value={value.join(' ')} />
							{/if}
						{:else}
							<PlaceFact label={formatLabel(key)} {value} />
						{/if}
					{/if}
				{/each}
				{#if facts?.other_facts && Array.isArray(facts.other_facts)}
					{#each facts.other_facts as fact}
						{#if fact.label && fact.description}
							<PlaceFact label={fact.label} value={fact.description} />
						{/if}
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>
