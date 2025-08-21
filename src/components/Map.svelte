<script>
	import { GlobeOutline } from 'flowbite-svelte-icons';
	import {
		coordinates,
		places,
		placesSurrounding,
		heading,
		placeDetailsVisible,
		waterMap,
		greenMap,
		activityMap,
		preferences
	} from '../stores.js';

	import { derived } from 'svelte/store';
	import { haversineDistance, latLonToX, latLonToY } from '../util/osm.js';
	import {
		GRID_CELL_SIZE,
		GRID_ARRAY_SIZE,
		GREEN_STIPPLE_SIZE,
		WATER_STIPPLE_SIZE,
		ACTIVITY_STIPPLE_SIZE,
		PLACE_MIN_DISTANCE
	} from '../constants/core.js';

	// Derived constants
	const SVG_SIZE = GRID_CELL_SIZE * GRID_ARRAY_SIZE;
	const SVG_CENTER = SVG_SIZE / 2;
	const GRID_OFFSET_X = SVG_CENTER;
	const GRID_OFFSET_Y = SVG_CENTER;
	const GRID_HEX_OFFSET = GRID_CELL_SIZE / 2;

	const placesToHighlight = derived(
		[places, placesSurrounding],
		([$places, $placesSurrounding]) => {
			const highlighted = [];
			const minDistance = PLACE_MIN_DISTANCE;

			if (!$places || !$placesSurrounding) return highlighted;

			const filteredPlaces = $places.filter(
				(place) =>
					place.lon &&
					place.lat &&
					place.stars > 0 &&
					!$placesSurrounding.find((p) => p.title === place.title)
			);

			// sort places by stars (descending; primary) and by place.dist (ascending; secondary)
			const sortedPlaces = filteredPlaces.sort((a, b) => {
				if (a.stars !== b.stars) {
					return b.stars - a.stars; // Sort by stars in descending order
				} else if (a.dist !== b.dist) {
					return a.dist - b.dist; // Sort by distance in ascending order
				}
				return 0; // No sorting needed if both stars and distance are equal
			});

			sortedPlaces.forEach((place) => {
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
		}
	);

	const animatedWaterStipples = derived(waterMap, ($waterMap) => {
		if (!$waterMap) return new Set();

		const candidates = [];
		$waterMap.forEach((row, rowIndex) => {
			row.forEach((cell, colIndex) => {
				if (cell && cell > 0.1) {
					const x = rowIndex * GRID_CELL_SIZE - GRID_OFFSET_X + (colIndex % 2) * GRID_HEX_OFFSET;
					const y = colIndex * GRID_CELL_SIZE - GRID_OFFSET_Y;
					const distanceFromCenter = Math.sqrt(x * x + y * y);
					if (distanceFromCenter < 450) {
						candidates.push(`${rowIndex}-${colIndex}`);
					}
				}
			});
		});

		// Shuffle and take up to 200
		const shuffled = candidates.sort(() => 0.5 - Math.random());
		return new Set(shuffled.slice(0, 200));
	});

	const animatedActivityStipples = derived(activityMap, ($activityMap) => {
		if (!$activityMap) return new Set();

		const animated = new Set();
		$activityMap.forEach((row, rowIndex) => {
			row.forEach((cell, colIndex) => {
				if (cell && cell > 0.1) {
					const x = rowIndex * GRID_CELL_SIZE - GRID_OFFSET_X + (colIndex % 2) * GRID_HEX_OFFSET;
					const y = colIndex * GRID_CELL_SIZE - GRID_OFFSET_Y;
					const distanceFromCenter = Math.sqrt(x * x + y * y);
					if (distanceFromCenter < 450) {
						// Use deterministic pattern: every 4th point in both directions for fewer animated points
						if (rowIndex % 4 === 1 && colIndex % 4 === 1) {
							animated.add(`${rowIndex}-${colIndex}`);
						}
					}
				}
			});
		});

		return animated;
	});

	const tryHyphenate = (word, lang) => {
		const hyphenationPatterns = {
			en: [
				'street',
				'church',
				'school',
				'center',
				'centre',
				'station',
				'building',
				'hospital',
				'university',
				'library',
				'museum'
			],
			de: [
				'kloster',
				'kirche',
				'schule',
				'straße',
				'strasse',
				'platz',
				'gasse',
				'zentrum',
				'bahnhof',
				'gebäude',
				'krankenhaus',
				'universität',
				'bibliothek',
				'gymnasium',
				'brunnen',
				'denkmal',
				'anstalt',
				'museum',
				'park',
				'hof',
				'schloss',
				'haus',
				'hafen',
				'allee',
				'weg',
				'markt',
				'passage',
				'steg',
				'brücke',
				'feld',
				'anger',
				'graben',
				'steig',
				'steige',
				'wall',
				'kamp',
				'garten',
				'terrasse',
				'promenade',
				'chaussee',
				'kai',
				'ufer',
				'stieg',
				'viertel',
				'koppel',
				'ried',
				'forst',
				'wald',
				'moor',
				'teich',
				'see',
				'weiher',
				'acker',
				'landwehr',
				'holz',
				'heide'
			]
		};

		const patterns = hyphenationPatterns[lang] || hyphenationPatterns.en;

		// Remove "..." if present at the end to check the actual word
		const cleanWord = word.endsWith('...') ? word.slice(0, -3) : word;
		const lowerWord = cleanWord.toLowerCase();

		for (const suffix of patterns) {
			if (lowerWord.endsWith(suffix) && lowerWord.length > suffix.length) {
				const prefixLength = cleanWord.length - suffix.length;
				const prefix = cleanWord.substring(0, prefixLength);
				const suffixPart = cleanWord.substring(prefixLength);

				// Only hyphenate if there's actually a prefix (compound word)
				if (prefix.length > 0) {
					const hyphenated = prefix + '-' + suffixPart;
					return word.endsWith('...') ? hyphenated + '...' : hyphenated;
				}
			}
		}

		return null;
	};

	const findOptimalSplit = (parts, separator, addSeparator = false) => {
		if (parts.length < 2) return null;

		let bestSplit = null;
		let bestScore = -1;

		// Try each possible split point
		for (let i = 1; i < parts.length; i++) {
			const firstLine = parts.slice(0, i).join(separator) + (addSeparator ? separator : '');
			const secondLine = parts.slice(i).join(separator);
			
			const firstLen = firstLine.length;
			const secondLen = secondLine.length;
			const totalLen = firstLen + secondLen;
			
			// Skip if either line is too short or too long
			if (firstLen < 2 || secondLen < 2 || firstLen > 20 || secondLen > 20) {
				continue;
			}
			
			// Calculate score: prefer longer first line, but penalize extreme imbalances
			let score = 0;
			
			// Bonus for longer first line (up to 1.5x second line length)
			if (firstLen >= secondLen) {
				score += 10;
				if (firstLen <= secondLen * 1.5) {
					score += 5; // Additional bonus for reasonable ratio
				}
			}
			
			// Penalty for imbalance (the closer to balanced, the better)
			const imbalance = Math.abs(firstLen - secondLen) / totalLen;
			score -= imbalance * 20;
			
			// Bonus for keeping total length reasonable
			if (totalLen <= 25) {
				score += 5;
			}
			
			if (score > bestScore) {
				bestScore = score;
				bestSplit = firstLine + '\n' + secondLine;
			}
		}

		return bestSplit;
	};

	const layoutLabel = (label) => {
		// Step 1: If longer than 25, try to cut at word boundary to get below 25
		if (label.length > 25) {
			// Try to cut at word boundary first
			const words = label.split(' ');
			if (words.length > 1) {
				let result = '';
				for (let i = 0; i < words.length; i++) {
					const test = result + (i > 0 ? ' ' : '') + words[i];
					if (test.length > 25) break;
					result = test;
				}
				if (result.length > 0) {
					label = result + '...';
				} else {
					// Single word longer than 25, cut at 15
					label = label.substring(0, 15) + '...';
				}
			} else {
				// Try to cut at hyphen boundary
				const parts = label.split('-');
				if (parts.length > 1) {
					let result = '';
					for (let i = 0; i < parts.length; i++) {
						const test = result + (i > 0 ? '-' : '') + parts[i];
						if (test.length > 25) break;
						result = test;
					}
					if (result.length > 0) {
						label = result + '...';
					} else {
						// Single part longer than 25, cut at 15
						label = label.substring(0, 15) + '...';
					}
				} else {
					// No word or hyphen boundary, cut at 15
					label = label.substring(0, 15) + '...';
				}
			}
		}

		// Step 2: Try to make two lines if multiple words/parts
		if (label.length > 10) {
			// First: Try splitting at word boundary with longer first line preference
			const words = label.split(' ');
			if (words.length > 1) {
				const bestSplit = findOptimalSplit(words, ' ');
				if (bestSplit) {
					return bestSplit;
				}
			}

			// Second: Try splitting at existing hyphen with longer first line preference
			const parts = label.split('-');
			if (parts.length > 1) {
				const bestSplit = findOptimalSplit(parts, '-', true);
				if (bestSplit) {
					return bestSplit;
				}
			}

			// Third: Try simple hyphenation for single long compound words
			const hyphenated = tryHyphenate(label, $preferences.lang);
			if (hyphenated && hyphenated.includes('-')) {
				const hyphenParts = hyphenated.split('-');
				if (hyphenParts.length === 2) {
					return hyphenParts[0] + '-\n' + hyphenParts[1];
				}
			}

			// Final fallback: If single word/part longer than 15, truncate at 15
			if (label.length > 15) {
				label = label.substring(0, 15) + '...';
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
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 {SVG_SIZE} {SVG_SIZE}"
		xmlns="http://www.w3.org/2000/svg"
	>
		<defs>
			<clipPath id="circleClip">
				<circle cx="0" cy="0" r={SVG_CENTER} />
			</clipPath>
			<radialGradient id="textGradient" cx="50%" cy="50%" r="75%">
				<stop offset="0%" style="stop-color:white;stop-opacity:0.7" />
				<stop offset="35%" style="stop-color:white;stop-opacity:0.3" />
				<stop offset="70%" style="stop-color:white;stop-opacity:0.05" />
				<stop offset="100%" style="stop-color:white;stop-opacity:0" />
			</radialGradient>
		</defs>
		<g transform="translate({SVG_CENTER}, {SVG_CENTER})">
			<g clip-path="url(#circleClip)">
				<!-- background: all places as blurred circles -->
				<g class="places-bg">
					{#each ($places || []).filter((place) => place.lon && place.lat && place.stars > 1) as place}
						<circle
							cx={latLonToX(place.lat, place.lon, $coordinates.latitude, $coordinates.longitude)}
							cy={latLonToY(place.lat, place.lon, $coordinates.latitude, $coordinates.longitude)}
							r={10 * place.stars}
							fill="#F59E0B"
							opacity={place.stars * 0.2}
							style="filter: blur(70px);"
						/>
					{/each}</g
				>
				<!-- green map -->
				{#if $preferences.labels?.includes('NATURE')}
					<g class="green-map">
						{#each $greenMap || [] as row, rowIndex}
							{#each row || [] as cell, colIndex}
								{#if cell}
									{@const triangleX =
										rowIndex * GRID_CELL_SIZE - GRID_OFFSET_X + (colIndex % 2) * GRID_HEX_OFFSET}
									{@const triangleY = colIndex * GRID_CELL_SIZE - GRID_OFFSET_Y}
									{@const triangleSize =
										((GREEN_STIPPLE_SIZE * GRID_CELL_SIZE) / 2) * Math.min(1, cell)}
									<polygon
										points="{triangleX},{triangleY - triangleSize} {triangleX -
											triangleSize},{triangleY + triangleSize} {triangleX +
											triangleSize},{triangleY + triangleSize}"
										class="green-triangle fill-current text-green-400 opacity-40"
									/>
								{/if}
							{/each}
						{/each}
					</g>
				{/if}
				<!-- water map -->
				<g class="water-map">
					{#each $waterMap || [] as row, rowIndex}
						{#each row || [] as cell, colIndex}
							{#if cell && cell > 0.1}
								{@const x =
									rowIndex * GRID_CELL_SIZE - GRID_OFFSET_X + (colIndex % 2) * GRID_HEX_OFFSET}
								{@const y = colIndex * GRID_CELL_SIZE - GRID_OFFSET_Y}
								{@const shouldAnimate = $animatedWaterStipples.has(`${rowIndex}-${colIndex}`)}
								<circle
									cx={x}
									cy={y}
									r={((WATER_STIPPLE_SIZE * GRID_CELL_SIZE) / 2) * Math.min(1, cell)}
									class="water-circle fill-current text-blue-300 {shouldAnimate ? 'animate' : ''}"
									style="--animation-duration: {3 +
										((rowIndex + colIndex) % 4)}s; --animation-delay: {((rowIndex * colIndex) %
										100) /
										20}s;"
									opacity={shouldAnimate ? undefined : 0.6}
								/>
							{/if}
						{/each}
					{/each}
				</g>
				<!-- activity map -->
				{#if $preferences.labels?.includes('ACTIVITIES')}
					<g class="activity-map">
						{#each $activityMap || [] as row, rowIndex}
							{#each row || [] as cell, colIndex}
								{#if cell && cell > 0.1}
									{@const x =
										rowIndex * GRID_CELL_SIZE - GRID_OFFSET_X + (colIndex % 2) * GRID_HEX_OFFSET}
									{@const y = colIndex * GRID_CELL_SIZE - GRID_OFFSET_Y}
									{@const shouldAnimate = $animatedActivityStipples.has(`${rowIndex}-${colIndex}`)}
									<rect
										x={x - ((ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE) / 2) * Math.min(1, cell)}
										y={y - ((ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE) / 2) * Math.min(1, cell)}
										width={ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE * Math.min(1, cell)}
										height={ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE * Math.min(1, cell)}
										class="activity-square fill-current text-purple-400 {shouldAnimate
											? 'animate-activity'
											: ''}"
										style="--animation-duration: {2.5 +
											((rowIndex + colIndex) % 3)}s; --animation-delay: {((rowIndex * colIndex) %
											150) /
											25}s;"
										opacity={shouldAnimate ? undefined : 0.5}
									/>
								{/if}
							{/each}
						{/each}
					</g>
				{/if}
				<!-- radius circles (below places) -->
				<g class="radius-circles">
					<circle
						cx="0"
						cy="0"
						r="100"
						class="here-circle stroke-current stroke-2 text-gray-400"
						fill="none"
					/>
					<circle
						cx="0"
						cy="0"
						r={SVG_CENTER - 1}
						class="clip-circle stroke-current stroke-2 text-gray-400"
						fill="none"
					/>
				</g>
				<!-- places -->
				<g class="places">
					{#each $placesToHighlight as place}
						{@const labelLines = layoutLabel(place.title).split('\n')}
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
							<ellipse
								cx="0"
								cy={labelLines.length > 1 ? 28 : 25}
								rx={labelLines.length > 1
									? Math.max(70, Math.max(...labelLines.map((line) => line.length)) * 7)
									: Math.max(55, labelLines[0].length * 6)}
								ry={labelLines.length > 1 ? 35 : 22}
								fill="url(#textGradient)"
							/>
							<circle
								cx="0"
								cy="0"
								r={6 + place.stars * 1.5}
								class="place-circle"
								fill={place.stars === 1
									? '#FFD5CC'
									: place.stars === 2
										? '#FFBCAD'
										: place.stars === 3
											? '#FE795D'
											: place.stars === 4
												? '#EF562F'
												: '#CC4522'}
								stroke="black"
								style="filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));"
							/>
							<text x="0" y="30" class="place-label text-lg" text-anchor="middle">
								{#each labelLines as line, index}
									<tspan x="0" dy={index === 0 ? 0 : '1.1em'}>{line}</tspan>
								{/each}
							</text>
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
					<circle cx="0" cy="0" r="10" class="position-circle" stroke-width="2">
						<animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
					</circle>
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
					dominant-baseline="middle">{SVG_CENTER}m</text
				>
				<!-- north arrow -->
				<g transform="translate({SVG_CENTER - 20},-{SVG_CENTER - 20})">
					<polygon points="0,-15 10,15 -10,15" fill="black" />
					<text
						x="0"
						y="30"
						class="clip-label text-lg"
						text-anchor="middle"
						dominant-baseline="middle">N</text
					>
				</g>
				<!-- legend left - locations and places -->
				<g class="legend-left" transform="translate(-{SVG_CENTER},300)">
					<!-- Position marker -->
					<circle cx="15" cy="0" r="6" class="position-circle" stroke-width="2" />
					<text x="25" y="5" class="text-lg" text-anchor="start">Your location</text>

					<!-- Places by star rating -->
					<circle cx="15" cy="25" r="7.5" fill="#FFD5CC" stroke="black" />
					<text x="25" y="30" class="text-lg" text-anchor="start">1-2 star places</text>

					<circle cx="15" cy="55" r="10.5" fill="#FE795D" stroke="black" />
					<text x="30" y="60" class="text-lg" text-anchor="start">3-4 star places</text>

					<circle cx="15" cy="85" r="13.5" fill="#CC4522" stroke="black" />
					<text x="35" y="90" class="text-lg" text-anchor="start">5 star places</text>
				</g>

				<!-- legend right - activity, green, water areas -->
				<g class="legend-right" transform="translate(260,340)">
					{#if $preferences.labels?.includes('ACTIVITIES')}
						<!-- Activity areas -->
						<rect
							x={10 - (ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE) / 2}
							y={0 - (ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE) / 2}
							width={ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE}
							height={ACTIVITY_STIPPLE_SIZE * GRID_CELL_SIZE}
							class="fill-current text-purple-300"
						/>
						<text x="20" y="5" class="text-lg" text-anchor="start">Activity areas</text>
					{/if}

					{#if $preferences.labels?.includes('NATURE')}
						<!-- Green areas -->
						{@const legendTriangleY = $preferences.labels?.includes('ACTIVITIES') ? 25 : 0}
						{@const legendTriangleSize = (GREEN_STIPPLE_SIZE * GRID_CELL_SIZE) / 2}
						<polygon
							points="10,{legendTriangleY - legendTriangleSize} {10 -
								legendTriangleSize},{legendTriangleY + legendTriangleSize} {10 +
								legendTriangleSize},{legendTriangleY + legendTriangleSize}"
							class="fill-current text-green-300"
						/>
						<text
							x="20"
							y={$preferences.labels?.includes('ACTIVITIES') ? 30 : 5}
							class="text-lg"
							text-anchor="start">Green areas</text
						>
					{/if}

					<!-- Water areas -->
					<circle
						cx="10"
						cy={($preferences.labels?.includes('ACTIVITIES') ? 25 : 0) +
							($preferences.labels?.includes('NATURE') ? 25 : 0)}
						r={(WATER_STIPPLE_SIZE * GRID_CELL_SIZE) / 2}
						class="fill-current text-blue-300"
					/>
					<text
						x="20"
						y={($preferences.labels?.includes('ACTIVITIES') ? 25 : 0) +
							($preferences.labels?.includes('NATURE') ? 25 : 0) +
							5}
						class="text-lg"
						text-anchor="start">Water areas</text
					>
				</g>
			</g></g
		></svg
	>
</div>

<style>
	@keyframes water-shimmer {
		0%,
		100% {
			opacity: 0.3;
		}
		20% {
			opacity: 0.9;
		}
		40% {
			opacity: 0.4;
		}
		60% {
			opacity: 0.8;
		}
		80% {
			opacity: 0.3;
		}
	}

	.water-circle.animate {
		animation: water-shimmer var(--animation-duration) infinite linear;
		animation-delay: var(--animation-delay);
	}

	@keyframes activity-pulse {
		0%,
		100% {
			opacity: 0.4;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.02);
		}
	}

	.activity-square.animate-activity {
		animation: activity-pulse var(--animation-duration) infinite ease-in-out;
		animation-delay: var(--animation-delay);
		transform-origin: center;
	}
</style>
