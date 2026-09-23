<script>
	import Button from 'flowbite-svelte/Button.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';
	import Spinner from 'flowbite-svelte/Spinner.svelte';
	import {
		FileOutline,
		MapPinAltOutline,
		GlobeOutline,
		DatabaseOutline,
		VolumeUpSolid,
		StopSolid
	} from 'flowbite-svelte-icons';
	import { summarizeArticle } from '../util/ai-facts.js';
	import { speak, stopSpeech } from '../util/ai-speech.js';
	import { createLogger } from '../util/logger.js';
	import { loadWikipediaArticleText } from '../util/wikipedia.js';
	import { get } from 'svelte/store';
	import {
		coordinates,
		places,
		placesSurrounding,
		preferences,
		placeDetailsVisible,
		loadPlaceImage,
		updateLocation,
		walk,
		visitedPlaceIdentities,
		audioState,
		errorMessage
	} from '../stores.js';
	import { getPlaceIdentity } from '../util/place-identity.js';
	import { formatWalkTime, getVisitedPlace } from '../util/walk.js';
	import { CheckCircleSolid } from 'flowbite-svelte-icons';
	import PlaceStars from './PlaceStars.svelte';
	import PlaceTitle from './PlaceTitle.svelte';
	import PlaceLabels from './PlaceLabels.svelte';
	import { derived } from 'svelte/store';
	import FactList from './facts/FactList.svelte';

	const logger = createLogger('place.details');

	export let place;
	const visible = derived(
		placeDetailsVisible,
		($placeDetailsVisible) => $placeDetailsVisible === place.title
	);

	// Reactive place that updates when the store updates (for image metadata, etc.)
	const reactivePlace = derived(places, ($places) => {
		return $places?.find((p) => p.title === place.title) || place;
	});

	$: isSurroundingPlace = $placesSurrounding.find((p) => p.title === place.title);
	$: visitedPlace = $visitedPlaceIdentities.has(getPlaceIdentity(place))
		? getVisitedPlace($walk, place)
		: null;
	let summary = null;
	let placeFactListComponent;
	let imageElement;
	let isPortrait = false;
	let summaryExpanded = false;
	let imageLoading = false;
	let summaryLoading = false;

	// Function to determine if image is portrait
	const onImageLoad = () => {
		if (imageElement) {
			isPortrait = imageElement.naturalHeight > imageElement.naturalWidth;
		}
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

	const loadModalImage = async () => {
		const currentPlace = get(reactivePlace);
		if (imageLoading || currentPlace?.image) {
			return;
		}
		imageLoading = true;
		try {
			await loadPlaceImage(currentPlace, 'image', 500);
		} finally {
			imageLoading = false;
		}
	};

	const loadModalSummary = async () => {
		const currentPlace = get(reactivePlace);
		if (summary || summaryLoading || !currentPlace) {
			return;
		}
		summaryLoading = true;
		try {
			const article =
				currentPlace.article ||
				(await loadWikipediaArticleText(currentPlace, $preferences.lang)) ||
				(currentPlace.description &&
					`${currentPlace.title}. ${currentPlace.description} (${currentPlace.type})`);
			if (article) {
				summary = await summarizeArticle(article, get(preferences));
			}
		} catch {
			summary = null;
		} finally {
			summaryLoading = false;
		}
	};

	$: if ($visible) {
		loadModalImage();
		loadModalSummary();
	}

	// Speech started here belongs to this modal until it ends or is replaced; closing the
	// modal stops it, while story audio playing underneath stays untouched
	let speakingSummary = false;
	$: if ($audioState === 'paused') {
		speakingSummary = false;
	}

	const playSummary = () => {
		const text = [summary?.short, summary?.long].filter(Boolean).join('\n\n');
		if (!text) {
			return;
		}
		speakingSummary = true;
		speak(text, get(preferences)).catch((error) => {
			logger.error('Place details playback failed', error);
			errorMessage.set('Error playing audio: ' + error);
		});
	};

	const stopSummary = () => {
		if (speakingSummary) {
			stopSpeech();
		}
	};

	const toggleSummaryExpanded = () => {
		summaryExpanded = !summaryExpanded;
		if (summaryExpanded && $preferences.audio && !speakingSummary) {
			playSummary();
		}
	};

	$: if (!$visible) {
		stopSummary();
	}
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
								rel="external noopener noreferrer"
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
								rel="external noopener noreferrer"
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
			{#if summary?.short}
				<div>
					<div class="float-right mb-1 ml-2">
						<Button
							on:click={speakingSummary ? stopSummary : playSummary}
							pill
							size="sm"
							outline
							class="!p-2"
							aria-label={speakingSummary ? 'Stop reading aloud' : 'Read aloud'}
						>
							{#if speakingSummary && $audioState === 'loading'}
								<Spinner size="4" />
							{:else if speakingSummary}
								<StopSolid size="sm" />
							{:else}
								<VolumeUpSolid size="sm" />
							{/if}
						</Button>
					</div>
					<p>{summary.short}</p>
					{#if summary.long}
						{#if summaryExpanded}
							<p class="mt-2 whitespace-pre-line">{summary.long}</p>
						{/if}
						<button
							type="button"
							class="mt-1 text-sm text-primary-800 hover:underline"
							on:click={toggleSummaryExpanded}
						>
							{summaryExpanded ? 'Show less' : 'Show more'}
						</button>
					{/if}
				</div>
			{:else if summaryLoading}
				<div class="text-gray-500">...</div>
			{/if}
			{#if visitedPlace}
				<div class="mt-3 flex items-center text-sm text-green-800">
					<CheckCircleSolid class="mr-1" />
					Visited earlier on this walk at {formatWalkTime(visitedPlace.firstVisitedAt)}
				</div>
			{/if}
			{#if !isSurroundingPlace}
				<hr class="my-4" />
				<PlaceStars item={place} detail />
			{/if}
			{#if !isSurroundingPlace}
				{#if place.labels}
					<hr class="my-4" />
					<PlaceLabels labels={place.labels} />
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
					<a href={place.url} target="_blank" rel="external" class="mr-3 flex">
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
