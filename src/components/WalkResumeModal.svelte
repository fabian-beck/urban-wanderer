<script>
	import Button from 'flowbite-svelte/Button.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';
	import { TrackingOutline } from 'flowbite-svelte-icons';
	import { walk, walkResumeCandidate, resolveWalkResume } from '../stores.js';
	import {
		formatWalkDistance,
		formatWalkDuration,
		formatWalkTime,
		getWalkLastActivity,
		getWalkStats
	} from '../util/walk.js';

	$: stats = $walkResumeCandidate && $walk ? getWalkStats($walk) : null;
	$: lastStop = $walk ? getWalkLastActivity($walk) : 0;
	$: lastStopLabel =
		new Date(lastStop).toDateString() === new Date().toDateString()
			? `today at ${formatWalkTime(lastStop)}`
			: new Date(lastStop).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
</script>

<Modal
	title="Continue your walk?"
	open={Boolean($walkResumeCandidate)}
	on:close={() => walkResumeCandidate.set(null)}
	size="xs"
>
	{#if stats}
		<p class="text-sm text-gray-700">
			Your last stop{stats.areas.length ? ` in ${stats.areas.join(', ')}` : ''} was {lastStopLabel},
			about {formatWalkDistance($walkResumeCandidate.distance)} from here.
		</p>
		<p class="mt-2 text-xs text-gray-500">
			{stats.stops}
			{stats.stops === 1 ? 'stop' : 'stops'}, {stats.visitedPlaces}
			{stats.visitedPlaces === 1 ? 'place' : 'places'}, {stats.stories}
			{stats.stories === 1 ? 'story' : 'stories'} read, {formatWalkDuration(stats.durationMs)} of walking.
		</p>
	{/if}
	<svelte:fragment slot="footer">
		<div class="flex w-full justify-end gap-2">
			<Button color="alternative" on:click={() => resolveWalkResume(false)}>Start new walk</Button>
			<Button on:click={() => resolveWalkResume(true)}>
				<TrackingOutline class="mr-2" />Continue walk
			</Button>
		</div>
	</svelte:fragment>
</Modal>
