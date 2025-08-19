<script>
	import { generateLocationComment } from '../util/ai-comment.js';
	import { placesHere, placesSurrounding, coordinates, preferences } from '../stores.js';
	import { Spinner } from 'flowbite-svelte';
	import { AnnotationOutline } from 'flowbite-svelte-icons';

	let comment = '';
	let loading = false;
	let error = null;

	// Generate comment when places data is available
	$: if ($placesHere.length > 0 || $placesSurrounding.length > 0) {
		generateComment();
	}

	async function generateComment() {
		if (loading || comment) return; // Avoid duplicate requests

		loading = true;
		error = null;

		try {
			comment = await generateLocationComment(
				$placesHere,
				$placesSurrounding,
				$coordinates,
				$preferences
			);
		} catch (err) {
			console.error('Failed to generate comment:', err);
			error = 'Could not generate comment';
		} finally {
			loading = false;
		}
	}

	// Reset comment when location changes
	$: if ($coordinates) {
		comment = '';
	}
</script>

<div class="mb-2 flex items-center text-primary-800">
	<AnnotationOutline />
	<h2 class="ml-2 flex-auto text-xl">Comment</h2>
</div>

{#if loading}
	<div class="flex items-center justify-center py-2">
		<Spinner class="mr-2" size="4" />
		<span class="text-sm text-gray-500">Generating comment...</span>
	</div>
{:else if error}
	<div class="py-2 text-sm text-gray-500">
		{error}
	</div>
{:else if comment}
	<div class="text-gray-700">
		<i>{comment}</i>
	</div>
{:else}
	<div class="py-2 text-sm text-gray-500">Loading location data...</div>
{/if}
