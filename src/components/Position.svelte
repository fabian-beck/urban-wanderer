<script>
	import { Button } from 'flowbite-svelte';
	import {
		RefreshOutline,
		MapPinAltOutline,
		MessageDotsOutline,
		CalendarMonthOutline
	} from 'flowbite-svelte-icons';
	import { coordinates } from '../stores.js';
	import StoryModal from './StoryModal.svelte';
	import HistoryModal from './HistoryModal.svelte';
	import { sineIn } from 'svelte/easing';

	export let loading = false;
	export let update;

	// format coordinates with N/S and E/W and degree symbols
	const formatCoordinates = (latitude, longitude) => {
		const lat = latitude >= 0 ? `${latitude.toFixed(4)}°N` : `${(-latitude).toFixed(4)}°S`;
		const lon = longitude >= 0 ? `${longitude.toFixed(4)}°E` : `${(-longitude).toFixed(4)}°W`;
		return `${lat}; ${lon}`;
	};

	let storyVisible = false;
	let historyVisible = false;
</script>

<div
	class="fixed bottom-0 left-0 right-0 m-2 flex min-h-10 items-center justify-center rounded-lg bg-gray-100 p-4 pt-6"
>
	{#if $coordinates}
		<div
			class="absolute -top-12 right-0 m-2 flex items-center justify-center rounded-full bg-gray-200 p-1"
		>
			<Button
				on:click={() => (storyVisible = true)}
				pill
				class="!p-2"
				color="alternative"
				disabled={loading}
				size="xl"
			>
				<MessageDotsOutline size="xl" />
			</Button>
		</div>
		<div
			class="absolute -top-12 right-16 m-2 flex items-center justify-center rounded-full bg-gray-200 p-1"
		>
			<Button
				on:click={() => (historyVisible = true)}
				pill
				class="!p-2"
				color="alternative"
				disabled={loading}
				size="xl"
			>
				<CalendarMonthOutline size="xl" />
			</Button>
		</div>
	{/if}
	<div class="flex flex-auto">
		{#if $coordinates}
			<div class="text-xs">
				<div>
					<a
						href={`https://www.google.com/maps/search/?api=1&query=${$coordinates.latitude},${$coordinates.longitude}`}
						target="_blank"
						class="flex"
					>
						<MapPinAltOutline size="xl" class="mr-1" />{$coordinates.address} ({formatCoordinates(
							$coordinates.latitude,
							$coordinates.longitude
						)})
					</a>
				</div>
			</div>
		{:else if !loading}
			<i class="text-sm text-primary-800">Click the refresh button to get your location</i>
		{/if}
	</div>
	<div class="ml-2 flex-none">
		<Button on:click={update} pill class="!p-2" disabled={loading}
			><RefreshOutline size="xl" /></Button
		>
	</div>
</div>
<StoryModal bind:visible={storyVisible} />
<HistoryModal bind:visible={historyVisible} />
