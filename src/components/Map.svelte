<script>
	import { GlobeOutline } from 'flowbite-svelte-icons';
	import {
		coordinates,
		places,
		placesSurrounding,
		heading,
		placeDetailsVisible,
		waterMap,
		greenMap
	} from '../stores.js';

	import { derived } from 'svelte/store';
	import { haversineDistance, latLonToX, latLonToY } from '../util/geo.js';

	const placesToHighlight = derived(places, ($places) => {
		const highlighted = [];
		const minDistance = 70; // Minimum distance in meters

		const filteredPlaces = $places?.filter(
			(place) =>
				place.lon &&
				place.lat &&
				place.stars > 0 &&
				!$placesSurrounding.find((p) => p.title === place.title)
		);

		// sort places by stars (descending; primary) and by place.dist (ascending; secondary)
		const sortedPlaces = filteredPlaces?.sort((a, b) => {
			if (a.stars !== b.stars) {
				return b.stars - a.stars; // Sort by stars in descending order
			} else if (a.dist !== b.dist) {
				return a.dist - b.dist; // Sort by distance in ascending order
			}
			return 0; // No sorting needed if both stars and distance are equal
		});

		sortedPlaces?.forEach((place) => {
			if (place.lon && place.lat && place.stars > 1) {
				const isTooClose = highlighted.some((highlightedPlace) => {
					const distance = haversineDistance(
						place.lat,
						place.lon,
						highlightedPlace.lat,
						highlightedPlace.lon
					);
					return distance < minDistance;
				});

				if (!isTooClose) {
					highlighted.push(place);
				}
			}
		});

		return highlighted;
	});

	const layoutLabel = (label) => {
		// Cut long labels and add "..."
		if (label.length > 20) {
			label = label.substring(0, 17) + '...';
		}
		// Prefer splitting at word boundary for line breaks
		if (label.length > 10) {
			const words = label.split(' ');
			if (words.length > 1) {
				const mid = Math.floor(words.length / 2);
				return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
			}
		}
		// If no word boundary, split at hyphen
		if (label.includes('-')) {
			const parts = label.split('-');
			if (parts.length > 1) {
				const mid = Math.floor(parts.length / 2);
				return parts.slice(0, mid).join('-') + '-\n' + parts.slice(mid).join('-');
			}
		}
		return label;
	};
</script>

<div class="mb-2 flex items-center text-primary-800">
	<GlobeOutline />
	<h2 class="ml-2 flex-auto text-xl">Map</h2>
</div>
<div>
	<svg width="100%" height="100%" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<clipPath id="circleClip">
				<circle cx="0" cy="0" r="400" />
			</clipPath>
		</defs>
		<g transform="translate(400, 400)">
			<g clip-path="url(#circleClip)">
				<!-- background: all places as blurred circles -->
				<g class="places-bg">
					{#each $places.filter((place) => place.lon && place.lat && place.stars > 1) as place}
						<circle
							cx={latLonToX(place.lat, place.lon, $coordinates.latitude, $coordinates.longitude)}
							cy={latLonToY(place.lat, place.lon, $coordinates.latitude, $coordinates.longitude)}
							r={10 * place.stars}
							class="place-circle fill-current text-primary-500 opacity-100"
							style="filter: blur(70px);"
						/>
					{/each}</g
				>
				<!-- water map -->
				<g class="water-map">
					{#each $waterMap as row, rowIndex}
						{#each row as cell, colIndex}
							{#if cell}
								<circle
									cx={rowIndex * 10 - 400}
									cy={colIndex * 10 - 400}
									r={5 * Math.min(1, cell)}
									class="water-circle fill-current text-blue-300 opacity-100"
								/>
							{/if}
						{/each}
					{/each}
				</g>
				<!-- green map -->
				<g class="green-map">
					{#each $greenMap as row, rowIndex}
						{#each row as cell, colIndex}
							{#if cell}
								<circle
									cx={rowIndex * 10 - 400}
									cy={colIndex * 10 - 400}
									r={4 * Math.min(1, cell)}
									class="green-circle fill-current text-green-400 opacity-40"
								/>
							{/if}
						{/each}
					{/each}
				</g>
				<!-- places -->
				<g class="places">
					{#each $placesToHighlight as place}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<g
							transform="translate({latLonToX(
								place.lat,
								place.lon,
								$coordinates.latitude,
								$coordinates.longitude
							)}, {latLonToY(place.lat, place.lon, $coordinates.latitude, $coordinates.longitude)})"
							on:click={() => placeDetailsVisible.set(place.title)}
							style="cursor: pointer;"
						>
							<circle
								cx="0"
								cy="0"
								r="10"
								class="place-circle fill-current text-primary-500"
								stroke="black"
							/>
							<text
								x="0"
								y="30"
								class="place-label text-lg"
								text-anchor="middle"
								style="white-space:pre-line; line-height:1.1">{layoutLabel(place.title)}</text
							>
						</g>
					{/each}
				</g>
				<!-- markers -->
				<g class="markers">
					<!-- heading direction maker (line) -->
					<line
						x1="0"
						y1="0"
						x2="0"
						y2="-20"
						class="marker-line black stroke-current"
						transform="rotate(-{$heading})"
						stroke-width="4"
					/>
					<circle cx="0" cy="0" r="10" class="position-circle" stroke-width="2" />
					<circle
						cx="0"
						cy="0"
						r="100"
						class="here-circle stroke-current stroke-2 text-gray-300"
						fill="none"
					/>
					<circle
						cx="0"
						cy="0"
						r="399"
						class="clip-circle stroke-current stroke-2 text-gray-300"
						fill="none"
					/>
				</g>
			</g>
			<g class="labels">
				<text
					x="70"
					y="90"
					class="clip-label text-lg"
					text-anchor="right"
					dominant-baseline="middle">100m</text
				>
				<text
					x="150"
					y="390"
					class="clip-label text-lg"
					text-anchor="right"
					dominant-baseline="middle">400m</text
				>
				<!-- north arrow -->
				<g transform="translate(380,-380)">
					<polygon points="0,-15 10,15 -10,15" fill="black" />
					<text
						x="0"
						y="30"
						class="clip-label text-lg"
						text-anchor="middle"
						dominant-baseline="middle">N</text
					>
				</g>
			</g></g
		></svg
	>
</div>

<style>
</style>
