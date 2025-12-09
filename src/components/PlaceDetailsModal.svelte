<script>
	import { onMount } from 'svelte';
	import { Button, Modal } from 'flowbite-svelte';
	import {
		FileOutline,
		MapPinAltOutline,
		GlobeOutline,
		DatabaseOutline
	} from 'flowbite-svelte-icons';
	import { summarizeArticle } from '../util/ai-facts.js';
	import { get } from 'svelte/store';
	import {
		coordinates,
		places,
		placesSurrounding,
		preferences,
		placeDetailsVisible,
		updateLocation
	} from '../stores.js';
	import { LABELS } from '../constants/ui-config.js';
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import { derived } from 'svelte/store';
	import FactList from './facts/FactList.svelte';

	export let place;
	const visible = derived(
		placeDetailsVisible,
		($placeDetailsVisible) => $placeDetailsVisible === place.title
	);

	// Reactive place that updates when the store updates (for image metadata, etc.)
	const reactivePlace = derived(places, ($places) => {
		return $places.find((p) => p.title === place.title) || place;
	});

	$: isSurroundingPlace = $placesSurrounding.find((p) => p.title === place.title);
	let summary = '';
	let placeFactListComponent;
	let imageElement;
	let isPortrait = false;
	let isExpanded = false;

	// Function to determine if image is portrait
	const onImageLoad = () => {
		if (imageElement) {
			isPortrait = imageElement.naturalHeight > imageElement.naturalWidth;
		}
	};

	// Helper function to get label name by value, returns null for invalid labels
	const getLabelName = (labelValue) => {
		const label = LABELS.find((l) => l.value === labelValue);
		return label ? label.name : null;
	};

	// Get platform name from source URL
	const getPlatformName = (url) => {
		if (!url) return null;
		if (url.includes('commons.wikimedia.org')) return 'Wikimedia Commons';
		if (url.includes('wikipedia.org')) return 'Wikipedia';
		return 'Source';
	};

	// Format author name, cleaning up HTML tags
	const formatAuthor = (artist) => {
		if (!artist) return null;
		// Remove HTML tags and decode entities
		const cleaned = artist.replace(/<[^>]*>/g, '').trim();
		// Truncate if too long
		return cleaned.length > 30 ? cleaned.substring(0, 27) + '...' : cleaned;
	};

	// Trigger fact loading when modal becomes visible
	$: if (
		$visible &&
		placeFactListComponent &&
		typeof placeFactListComponent.loadFacts === 'function'
	) {
		placeFactListComponent.loadFacts();
	}

	onMount(() => {
		(async () => {
			if (place.pageid || (place.wikipedia && !place.wikipedia.includes('#'))) {
				const url = place.pageid
					? `https://${place.lang || $preferences.lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&pageids=${place.pageid}&origin=*`
					: `https://${place.wikipedia.split(':')[0]}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&titles=${place.wikipedia.split(':')[1]}&origin=*`;
				const response = await fetch(url);
				const data = await response.json();
				summary = await summarizeArticle(
					Object.values(data.query.pages)[0].extract,
					get(preferences)
				);
			} else if (place.description) {
				summary = await summarizeArticle(
					`${place.title}. ${place.description} (${place.type})`,
					get(preferences)
				);
			}
		})();
	});
</script>

<Modal
	title={place.title}
	classBody="p-0 overscroll-none"
	classDialog="z-[60]"
	open={$visible}
	on:close={() => placeDetailsVisible.set('')}
>
	<svelte:fragment slot="header">
		<span class="text-xl"><PlaceTitle {place} /></span>
	</svelte:fragment>
	<div class="flex min-h-screen flex-col">
		{#if $reactivePlace.image}
			<div class="relative mb-2 overflow-visible">
				<img
					bind:this={imageElement}
					src={$reactivePlace.image}
					alt={$reactivePlace.title}
					on:load={onImageLoad}
					class="w-full {isPortrait ? 'aspect-square object-cover' : 'h-64 object-cover'}"
				/>
				{#if $reactivePlace.imageSource || $reactivePlace.imageLicense}
					<div
						class="absolute bottom-0 right-2 z-10 flex items-center gap-0.5 rounded-tl bg-black/70 px-0.5 py-[1px] text-[8px] leading-tight text-white hover:bg-black/90"
					>
						{#if $reactivePlace.imageSource}
							<a
								href={$reactivePlace.imageSource}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:underline"
								aria-label="View image source"
							>
								{getPlatformName($reactivePlace.imageSource)}
							</a>
						{/if}
						{#if formatAuthor($reactivePlace.imageArtist)}
							<span class="opacity-70">({formatAuthor($reactivePlace.imageArtist)})</span>
						{/if}
						{#if ($reactivePlace.imageSource || $reactivePlace.imageArtist) && $reactivePlace.imageLicense}
							<span class="opacity-50">·</span>
						{/if}
						{#if $reactivePlace.imageLicense}
							<a
								href={$reactivePlace.imageLicenseUrl || $reactivePlace.imageSource}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:underline"
								aria-label="View image license"
							>
								{$reactivePlace.imageLicense}
							</a>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
		<div class="p-4">
			{#if place.pageid || place.wikipedia || place.description}
				<div class="flex flex-auto">
					{#if summary}
						<div
							on:click={() => (isExpanded = !isExpanded)}
							on:keydown={(e) => e.key === 'Enter' && (isExpanded = !isExpanded)}
							role="button"
							tabindex="0"
							class={`cursor-pointer ${isExpanded ? '' : 'line-clamp-3'}`}
						>
							{summary}
						</div>
					{:else}
						...
					{/if}
				</div>
			{/if}
			{#if !isSurroundingPlace}
				<hr class="my-4" />
				<PlaceStars item={place} detail />
			{/if}
			{#if !isSurroundingPlace}
				{#if place.labels}
					<hr class="my-4" />
					<div class="flex flex-wrap">
						{#each place.labels
							.filter((label) => getLabelName(label) !== null)
							.sort((a, b) => {
								const aMatches = $preferences.labels?.includes(a);
								const bMatches = $preferences.labels?.includes(b);
								if (aMatches && !bMatches) return -1;
								if (!aMatches && bMatches) return 1;
								return 0;
							}) as label}
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
			{/if}
			<hr class="my-4" />
			<FactList {place} bind:this={placeFactListComponent} />
			{#if place.lon && place.lat}
				<hr class="my-4" />
				<Button
					on:click={() => {
						updateLocation({ latitude: place.lat, longitude: place.lon });
						placeDetailsVisible.set('');
					}}
					class="m-1 mt-2 flex items-center rounded-full bg-primary-800 p-2 text-white shadow-lg"
				>
					<MapPinAltOutline class="!mr-1" />Jump to this place
				</Button>
			{/if}
		</div>
	</div>
	<svelte:fragment slot="footer">
		<div class="flex w-full justify-between text-xs">
			<div class="flex">
				{#if place.pageid}
					<a
						href={`https://${place.lang || $preferences.lang}.m.wikipedia.org/?curid=${place.pageid}`}
						target="_blank"
						class="mr-3 flex"
					>
						<FileOutline class="!mr-1" />Wikipedia
					</a>
				{:else if place.wikipedia}
					<!-- item.wikipedia="de:name" -> "https://de.wikipedia.org/wiki/name" -->
					<a
						href={`https://${place.wikipedia.split(':')[0]}.wikipedia.org/wiki/${place.wikipedia.split(':')[1]}`}
						target="_blank"
						class="mr-3 flex"
					>
						<FileOutline class="!mr-1" />Wikipedia
					</a>
				{:else if place.url}
					<a href={place.url} target="_blank" class="mr-3 flex">
						<GlobeOutline class="!mr-1" />Page
					</a>
				{/if}
				{#if place.wikidata}
					<a href={`https://www.wikidata.org/wiki/${place.wikidata}`} target="_blank" class="flex">
						<DatabaseOutline class="!mr-1" />WikiData
					</a>
				{/if}
			</div>
			{#if place.lon && place.lat}
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`}
					target="_blank"
					class="flex"
				>
					<span>
						{#if place.dist >= 50}
							{Math.floor(place.dist / 50) * 50}&nbsp;m
						{:else}
							here
						{/if}
					</span>
					<MapPinAltOutline class="!ml-1" />
				</a>
			{:else if place.title}
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${place.title}${$coordinates.town ? ', ' + $coordinates.town : ''}`}
					target="_blank"
					class="flex"
				>
					<MapPinAltOutline class="!ml-1" />
				</a>
			{/if}
		</div>
	</svelte:fragment>
</Modal>
