import { coordinates, preferences, places, waterMap, greenMap, activityMap } from '../stores.js';
import { nArticles, GRID_ARRAY_SIZE, GRID_CELL_SIZE } from '../constants.js';
import { get } from 'svelte/store';
import { extractInsightsFromArticle } from './ai.js';

export async function loadWikipediaPlaces() {
	const $coordinates = get(coordinates);
	if (!$coordinates) {
		return;
	}
	const places = [];
	get(preferences).sourceLanguages?.forEach(async (lang) => {
		places.push(...(await wikipediaGeoSearchForPlaces($coordinates, lang)));
	});
	const searchAndAddPlace = async (title) => {
		if (title && !places.find((place) => place?.title === title)) {
			let place = await wikipediaNameSearchForPlace(title);
			if (!place) {
				return;
			}
			places.push(place);
		}
	};
	if ($coordinates.town) {
		searchAndAddPlace($coordinates.town);
		if ($coordinates.village) {
			searchAndAddPlace(`${$coordinates.village} (${$coordinates.town})`);
		}
		if ($coordinates.suburb) {
			searchAndAddPlace(`${$coordinates.suburb} (${$coordinates.town})`);
		}
		if ($coordinates.road) {
			searchAndAddPlace(`${$coordinates.road} (${$coordinates.town})`);
		}
	} else {
		searchAndAddPlace($coordinates.village);
	}
	console.log('Wikipedia places:', places);
	return places;
}

export async function loadArticleTexts(places, extractInsights = true) {
	await Promise.all(
		places.map(async (place) => {
			if (!place.pageid) {
				return;
			}
			const response = await fetch(
				`https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=revisions|pageprops&rvprop=content&rvslots=main&ppprop=wikibase_item`
			);
			const data = await response.json();
			const pageData = data.query.pages[place.pageid];
			place.article = pageData.revisions[0].slots.main['*'];

			// Extract WikiData ID if available
			if (pageData.pageprops?.wikibase_item) {
				place.wikidata = pageData.pageprops.wikibase_item;
				console.log(`📋 Found WikiData ID from Wikipedia: ${place.title} → ${place.wikidata}`);
			}
			// delete all wiki tables
			place.article = place.article.replace(/\{\|[\s\S]*?\|\}/g, '');
			place.article = place.article.replace(/\{\{[\s\S]*?\}\}/g, '');
			// delete all URLs
			place.article = place.article.replace(/\[http[^\]]*\]/g, '');
			// article still too long?
			if (place.article.length > 20000) {
				place.article = place.article.substring(0, 20000) + '...';
			}
			// extracts insights (only if requested)
			if (extractInsights) {
				place.insights = await extractInsightsFromArticle(place.article);
			}
		})
	);
}

export async function loadExtracts(places) {
	await Promise.all(
		places.map(async (place) => {
			if (!place.pageid && !place.wikipedia) {
				return;
			}
			let response;
			try {
				if (place.pageid) {
					response = await fetch(
						`https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=extracts&exintro=1&explaintext=1`
					);
				} else if (place.wikipedia) {
					// return if wikipedia link contains "#" (subheading) as the returned extract would not relate to the place
					if (place.wikipedia.includes('#')) {
						console.warn(
							`Not loading description as Wikipedia reference contains "#": ${place.wikipedia}`
						);
						return;
					}
					const placeLang = place.wikipedia.split(':')[0];
					const placeTitle = place.wikipedia.split(':')[1];
					response = await fetch(
						`https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=${placeTitle}`
					);
				}
				if (!response.ok) {
					console.error(
						`Failed to fetch extract for place: ${place.title}. HTTP status: ${response.status}`
					);
					return;
				}
				const data = await response.json();
				const pageid = Object.keys(data.query.pages)[0];
				if (data.query.pages[pageid].missing) {
					console.warn(`Extract not found for place: ${place.title}`);
					return;
				}
				place.description = data.query.pages[pageid].extract;
			} catch (error) {
				console.error(`Error fetching extract for place: ${place.title}`, error);
			}
		})
	);
}

export async function loadWikipediaImageUrls(attribute, size) {
	await Promise.all(
		get(places).map(async (place) => {
			let response;
			if (place.wikipedia) {
				if (place.wikipedia.includes('#')) {
					console.warn(
						`Not loading image (${attribute}) as Wikipedia reference contains "#": ${place.wikipedia}`
					);
					return;
				}
				const placeLang = place.wikipedia.split(':')[0];
				const placeTitle = place.wikipedia.split(':')[1];
				response = await fetch(
					`https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${placeTitle}&origin=*&pithumbsize=${size}`
				);
			} else if (place.pageid) {
				response = await fetch(
					`https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=pageimages&pithumbsize=${size}`
				);
			}
			if (!response) {
				return;
			}
			const data = await response.json();
			const pageid = Object.keys(data.query.pages)[0];
			if (data.query.pages[pageid].thumbnail) {
				place[attribute] = data.query.pages[pageid].thumbnail?.source;
			} else {
				// load first image from wiki page
				const response2 = await fetch(
					`https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&prop=images&pageids=${place.pageid}&origin=*`
				);
				const data2 = await response2.json();
				const images = data2.query.pages[place.pageid].images;
				if (images) {
					const firstImage = images[0].title;
					const response3 = await fetch(
						`https://${place.lang || get(preferences).lang}.wikipedia.org/w/api.php?action=query&format=json&titles=${firstImage}&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=${size}`
					);
					const data3 = await response3.json();
					const imageinfo = Object.values(data3.query.pages)[0].imageinfo;
					if (imageinfo) {
						place[attribute] = imageinfo[0].url;
					}
				}
			}
			places.set(get(places));
		})
	);
}

export async function loadOsmPlaces() {
	try {
		const $coordinates = get(coordinates);
		const radius = 150;
		const waterway =
			'river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point';
		const amenities = 'museum|school|college|university|library|place_of_worship';
		const tourism =
			'viewpoint|attraction|mall|zoo|theme_park|aquarium|gallery|artwork|memorial|museum|theatre|cinema';
		const historic =
			'monument|memorial|monument|memorial|ruins|castle|church|tomb|battlefield|fort|city_gate|citywalls|gate|archaeological_site';
		const man_made =
			'statue|sculpture|obelisk|stone|cross|wayside_cross|wayside_shrine|shelter|tower|water_tower|chimney|bridge|tunnel|mine|adit|bunker|silo|tank|reservoir|water_tank|water_reservoir|storage_tank|storage_reservoir|water_storage_tank|water_storage_reservoir|storage|container';
		const leisure = 'park|nature_reserve|sports_centre|stadium';

		const overpassQuery = `
[out:json];
(
    // Search for waterways
    relation[waterway~"${waterway}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for amenities
    node[amenity~"${amenities}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[amenity~"${amenities}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[amenity~"${amenities}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for tourism-related points of interest
    node[tourism~"${tourism}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[tourism~"${tourism}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[tourism~"${tourism}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for historic landmarks such as monuments and memorials
    node[historic~"${historic}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[historic~"${historic}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[historic~"${historic}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for man-made structures such as statues
    node[man_made~"${man_made}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[man_made~"${man_made}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[man_made~"${man_made}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});

    // Search for leisure facilities such as parks and gardens
    node[leisure~"${leisure}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    way[leisure~"${leisure}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
    relation[leisure~"${leisure}"](around:${radius},${$coordinates.latitude},${$coordinates.longitude});
);
out body;
>;
out skel qt;
`;
		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `data=${encodeURIComponent(overpassQuery)}`
		});
		const data = await response.json();
		console.log('OSM response:', data);
		const places = data.elements
			.filter((element) => element.tags?.name)
			.map((element) => {
				const tags = element.tags;
				let title = tags.name.replace(/\s*\(.*?\)\s*/g, '');
				title = title.split(',')[0];
				return {
					title: title,
					description: tags.description,
					type:
						tags.waterway ||
						tags.amenity ||
						tags.tourism ||
						tags.historic ||
						tags.man_made ||
						tags.leisure,
					url: tags['contact:website'] || tags.website,
					wikipedia: tags.wikipedia,
					wikidata: tags.wikidata,
					lat: element.lat,
					lon: element.lon,
					dist:
						Math.sqrt(
							Math.pow(element.lat - $coordinates.latitude, 2) +
								Math.pow(element.lon - $coordinates.longitude, 2)
						) * 111139 // convert degrees to meters
				};
			});

		console.log('OSM places:', places);
		return places;
	} catch (error) {
		console.error('Could not load OSM places:', error);
	}
}

export async function loadAddressData(coords) {
	const lang = get(preferences).lang;
	const response = await fetch(
		`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1&accept-language=${lang}`
	);
	const data = await response.json();
	return data;
}

export async function getRandomPlaceCoordinates() {
	const lang = get(preferences).lang;
	while (true) {
		const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`);
		const data = await response.json();
		if (data.coordinates) {
			return { latitude: data.coordinates.lat, longitude: data.coordinates.lon };
		}
	}
}

export async function searchPlaceCoordinates(placeName) {
	const lang = get(preferences).lang;
	
	// Search for the place on Wikipedia
	const searchResponse = await fetch(
		`https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(placeName)}&limit=5&format=json&origin=*`
	);
	const searchData = await searchResponse.json();
	
	if (!searchData[1] || searchData[1].length === 0) {
		throw new Error(`No Wikipedia articles found for "${placeName}"`);
	}
	
	// Try each search result until we find one with coordinates
	for (const title of searchData[1]) {
		try {
			// Get page info including coordinates
			const pageResponse = await fetch(
				`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=coordinates|extracts&exintro=1&explaintext=1&exlimit=1&format=json&origin=*`
			);
			const pageData = await pageResponse.json();
			
			const pages = pageData.query.pages;
			const pageId = Object.keys(pages)[0];
			const page = pages[pageId];
			
			// Check if this page has coordinates
			if (page.coordinates && page.coordinates.length > 0) {
				const coords = page.coordinates[0];
				console.log(`Found coordinates for "${title}":`, coords);
				return { 
					latitude: coords.lat, 
					longitude: coords.lon,
					title: title,
					description: page.extract
				};
			}
		} catch (error) {
			console.warn(`Error checking coordinates for "${title}":`, error);
			continue;
		}
	}
	
	throw new Error(`No geographic coordinates found for "${placeName}"`);
}

async function wikipediaGeoSearchForPlaces(coordinates, lang) {
	const response = await fetch(
		`https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coordinates.latitude}|${coordinates.longitude}&gsradius=${get(preferences).radius}&gslimit=${nArticles}&format=json&origin=*`
	);
	const data = await response.json();
	data.query.geosearch.forEach((place) => {
		// remove brackets from titles
		place.title = place.title.replace(/\s*\(.*?\)\s*/g, '');
		// remove text after comma
		place.title = place.title.split(',')[0];
		place.lang = lang;
	});
	console.log('Wikipedia geosearch response:', data);
	return data.query.geosearch;
}

async function wikipediaNameSearchForPlace(name) {
	const lang = get(preferences).lang;
	const response2 = await fetch(
		`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${name}&srlimit=1&format=json&origin=*`
	);
	const data2 = await response2.json();
	// for each search result, check if it has geocoordinates and is close to $coordinates
	for (const searchResult of data2.query.search) {
		// get geocoordinates through pageid
		const response3 = await fetch(
			`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&pageids=${searchResult.pageid}&origin=*`
		);
		const data3 = await response3.json();
		const pageid = Object.keys(data3.query.pages)[0];
		const page = data3.query.pages[pageid];

		// Skip if page has no coordinates
		if (!page.coordinates || page.coordinates.length === 0) {
			continue;
		}

		const coords = page.coordinates[0];
		// calculate distance
		const distance =
			Math.sqrt(
				Math.pow(coords.lat - get(coordinates).latitude, 2) +
					Math.pow(coords.lon - get(coordinates).longitude, 2)
			) * 111139; // convert degrees to meters
		// if close enough, return place
		if (distance < 10000) {
			searchResult.title = searchResult.title.replace(/\s*\(.*?\)\s*/g, '');
			searchResult.title = searchResult.title.split(',')[0];
			if (
				name.toLowerCase().includes(searchResult.title.toLowerCase()) ||
				searchResult.title.toLowerCase().includes(name.toLowerCase())
			) {
				console.log('Wikipedia name search response:', [name, searchResult]);
				return searchResult;
			}
		}
	}
	console.warn(`Could not find Wikipedia article for ${name}.`);
	return;
}

// Calculate the distance between two geographical points using the Haversine formula
export function haversineDistance(lat1, lon1, lat2, lon2) {
	const R = 6371000; // Earth radius in meters
	const toRad = (deg) => (deg * Math.PI) / 180;

	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

// Calculate x coordinate from latitude and longitude given a center point
export function latLonToX(lat, lon, centerLat, centerLon) {
	return haversineDistance(centerLat, centerLon, centerLat, lon) * (lon >= centerLon ? 1 : -1);
}

// Calculate y coordinate from latitude and longitude given a center point
export function latLonToY(lat, lon, centerLat, centerLon) {
	return haversineDistance(centerLat, centerLon, lat, centerLon) * (lat >= centerLat ? -1 : 1);
}

// Convert coordinates to grid position accounting for alternating row offset
export function coordsToGridX(lat, lon, centerLat, centerLon) {
	const GRID_CENTER_OFFSET = GRID_ARRAY_SIZE / 2; // Center offset for grid array
	const baseX =
		latLonToX(lat, lon, centerLat, centerLon) / GRID_CELL_SIZE + GRID_CENTER_OFFSET;
	const y = Math.floor(
		latLonToY(lat, lon, centerLat, centerLon) / GRID_CELL_SIZE + GRID_CENTER_OFFSET
	);
	// Account for the alternating row offset when converting back to grid coordinates
	const offsetX = baseX - (y % 2) * 0.5;
	return Math.floor(offsetX);
}

export function coordsToGridY(lat, lon, centerLat, centerLon) {
	const GRID_CENTER_OFFSET = GRID_ARRAY_SIZE / 2; // Center offset for grid array
	return Math.floor(
		latLonToY(lat, lon, centerLat, centerLon) / GRID_CELL_SIZE + GRID_CENTER_OFFSET
	);
}

// water map
export async function loadWaterMap() {
	try {
		const increaseWaterLevel = (x, y, value) => {
			if (value < 0.1) {
				return;
			}
			if (x >= 0 && x < GRID_ARRAY_SIZE && y >= 0 && y < GRID_ARRAY_SIZE) {
				waterMapTmp[x][y] += value;
				if (waterMapTmp[x][y] > 1) {
					waterMapTmp[x][y] = 1;
				}
				increaseWaterLevel(x + 1, y, value / 4);
				increaseWaterLevel(x - 1, y, value / 4);
				increaseWaterLevel(x, y + 1, value / 4);
				increaseWaterLevel(x, y - 1, value / 4);
			}
		};

		const overpassQuery = `
[out:json];
(
    // Search for water bodies
    relation[waterway~"river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    way[waterway~"river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    node[waterway~"river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
);
out body;
>;
out skel qt;
`;
		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `data=${encodeURIComponent(overpassQuery)}`
		});
		const data = await response.json();
		console.log('Water map response:', data);
		// Helper function to determine waterway width based on OSM data
		const getWaterwayWidth = (tags) => {
			// Use explicit width if available
			if (tags.width) {
				const width = parseFloat(tags.width);
				if (!isNaN(width)) {
					return Math.min(Math.max(width / 10, 0.3), 3.0); // Scale to 0.3-3.0 range
				}
			}

			// Base width on waterway type (adjusted for radius-based rendering)
			const waterwayType = tags.waterway;
			switch (waterwayType) {
				case 'river':
					// Check for navigation hints for major rivers
					if (tags.boat === 'yes' || tags.motorboat === 'yes' || tags.ship === 'yes') {
						return 2.4; // Major navigable river
					}
					return 1.8; // Regular river
				case 'stream':
					return 0.8; // Stream
				case 'canal':
					return tags.boat === 'yes' ? 2.0 : 1.2; // Navigable vs regular canal
				case 'ditch':
				case 'drain':
					return 0.6; // Small drainage
				case 'weir':
				case 'dam':
					return 1.4; // Water structure
				default:
					return 1.0; // Default
			}
		};

		const waterPolylines = data.elements
			.filter((element) => element.type === 'way' && element.tags?.waterway)
			.map((element) => {
				const nodes = element.nodes
					.map((nodeId) => {
						const node = data.elements.find((el) => el.type === 'node' && el.id === nodeId);
						return node
							? {
									lat: node.lat,
									lon: node.lon
								}
							: null;
					})
					.filter((node) => node !== null);

				const width = getWaterwayWidth(element.tags);

				return {
					type: 'polyline',
					name: element.tags?.name || `${element.tags.waterway}`,
					waterway: element.tags.waterway,
					width: width,
					nodes: nodes
				};
			});
		console.log('Water polylines:', waterPolylines);
		// Helper function to draw a thick line by filling all points within radius
		const drawThickLine = (x1, y1, x2, y2, radius, intensity) => {
			// Bresenham line algorithm to get the center line points
			const centerPoints = [];
			let x = x1;
			let y = y1;
			const dx = Math.abs(x2 - x1);
			const dy = Math.abs(y2 - y1);
			const sx = x1 < x2 ? 1 : -1;
			const sy = y1 < y2 ? 1 : -1;
			let err = dx - dy;

			while (true) {
				centerPoints.push({ x, y });
				if (x === x2 && y === y2) break;

				const e2 = 2 * err;
				if (e2 > -dy) {
					err -= dy;
					x += sx;
				}
				if (e2 < dx) {
					err += dx;
					y += sy;
				}
			}

			// For each center point, fill a circle around it
			for (const point of centerPoints) {
				const radiusInt = Math.ceil(radius);
				for (let dy = -radiusInt; dy <= radiusInt; dy++) {
					for (let dx = -radiusInt; dx <= radiusInt; dx++) {
						const distance = Math.sqrt(dx * dx + dy * dy);
						if (distance <= radius) {
							const px = point.x + dx;
							const py = point.y + dy;
							// Fade intensity based on distance from center
							const fadeIntensity = intensity * (1 - distance / (radius + 0.5));
							increaseWaterLevel(px, py, fadeIntensity);
						}
					}
				}
			}
		};

		const waterMapTmp = new Array(GRID_ARRAY_SIZE)
			.fill(0)
			.map(() => new Array(GRID_ARRAY_SIZE).fill(0));
		for (const polyline of waterPolylines) {
			const waterwayRadius = polyline.width / 2.0; // Convert width to radius
			const waterIntensity = Math.min(1.0, polyline.width / 1.5); // Scale intensity

			for (let i = 0; i < polyline.nodes.length - 1; i++) {
				const lat1 = polyline.nodes[i].lat;
				const lon1 = polyline.nodes[i].lon;
				const lat2 = polyline.nodes[i + 1].lat;
				const lon2 = polyline.nodes[i + 1].lon;
				// calculate x and y coordinates in the grid
				const x1 = coordsToGridX(lat1, lon1, get(coordinates).latitude, get(coordinates).longitude);
				const y1 = coordsToGridY(lat1, lon1, get(coordinates).latitude, get(coordinates).longitude);
				const x2 = coordsToGridX(lat2, lon2, get(coordinates).latitude, get(coordinates).longitude);
				const y2 = coordsToGridY(lat2, lon2, get(coordinates).latitude, get(coordinates).longitude);

				// Draw thick line between the two points
				drawThickLine(x1, y1, x2, y2, waterwayRadius, waterIntensity);
			}
		}
		waterMap.set(waterMapTmp);
	} catch (error) {
		console.error('Error loading water map:', error);
	}
}

// green map
export async function loadGreenMap() {
	try {
		const increaseGreenLevel = (x, y, value) => {
			if (value < 0.05) {
				return;
			}
			if (x >= 0 && x < GRID_ARRAY_SIZE && y >= 0 && y < GRID_ARRAY_SIZE) {
				greenMapTmp[x][y] += value;
				if (greenMapTmp[x][y] > 1) {
					greenMapTmp[x][y] = 1;
				}
				// Stronger propagation for better area coverage
				if (value > 0.3) {
					increaseGreenLevel(x + 1, y, value / 4);
					increaseGreenLevel(x - 1, y, value / 4);
					increaseGreenLevel(x, y + 1, value / 4);
					increaseGreenLevel(x, y - 1, value / 4);
				}
			}
		};

		// Simple polygon fill algorithm using scan line
		const fillPolygon = (nodes, value) => {
			if (nodes.length < 3) return;

			// Convert nodes to grid coordinates
			const gridNodes = nodes
				.map((node) => ({
					x: coordsToGridX(
						node.lat,
						node.lon,
						get(coordinates).latitude,
						get(coordinates).longitude
					),
					y: coordsToGridY(
						node.lat,
						node.lon,
						get(coordinates).latitude,
						get(coordinates).longitude
					)
				}))
				.filter(
					(node) =>
						node.x >= 0 && node.x < GRID_ARRAY_SIZE && node.y >= 0 && node.y < GRID_ARRAY_SIZE
				);

			if (gridNodes.length < 3) return;

			// Find bounding box
			const minY = Math.max(0, Math.min(...gridNodes.map((n) => n.y)));
			const maxY = Math.min(GRID_ARRAY_SIZE - 1, Math.max(...gridNodes.map((n) => n.y)));

			// Scan line algorithm
			for (let y = minY; y <= maxY; y++) {
				const intersections = [];

				// Find intersections with polygon edges
				for (let i = 0; i < gridNodes.length; i++) {
					const j = (i + 1) % gridNodes.length;
					const p1 = gridNodes[i];
					const p2 = gridNodes[j];

					if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
						const x = p1.x + ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y);
						intersections.push(x);
					}
				}

				// Sort intersections and fill between pairs
				intersections.sort((a, b) => a - b);
				for (let i = 0; i < intersections.length; i += 2) {
					if (i + 1 < intersections.length) {
						const startX = Math.max(0, Math.ceil(intersections[i]));
						const endX = Math.min(GRID_ARRAY_SIZE - 1, Math.floor(intersections[i + 1]));

						for (let x = startX; x <= endX; x++) {
							increaseGreenLevel(x, y, value);
						}
					}
				}
			}
		};

		const overpassQuery = `
[out:json];
(
    // Search for green spaces and natural areas
    relation[landuse~"forest|meadow|orchard|vineyard|grass|recreation_ground|village_green"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    way[landuse~"forest|meadow|orchard|vineyard|grass|recreation_ground|village_green"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    
    relation[leisure~"park|nature_reserve|garden|common|recreation_ground|pitch|playground"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    way[leisure~"park|nature_reserve|garden|common|recreation_ground|pitch|playground"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    
    relation[natural~"wood|scrub|grassland|heath|moor|wetland|marsh|fell|bare_rock|scree|shingle|sand|beach|coastline|tree_row"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    way[natural~"wood|scrub|grassland|heath|moor|wetland|marsh|fell|bare_rock|scree|shingle|sand|beach|coastline|tree_row"](around:800,${get(coordinates).latitude},${get(coordinates).longitude});
    
    // Individual trees
    node[natural="tree"](around:400,${get(coordinates).latitude},${get(coordinates).longitude});
);
out body;
>;
out skel qt;
`;
		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `data=${encodeURIComponent(overpassQuery)}`
		});
		const data = await response.json();
		console.log('Green map response:', data);

		const greenMapTmp = new Array(GRID_ARRAY_SIZE)
			.fill(0)
			.map(() => new Array(GRID_ARRAY_SIZE).fill(0));

		// Helper function to extract nodes from ways
		const getNodesFromWay = (way) => {
			return (
				way.nodes
					?.map((nodeId) => {
						const node = data.elements.find((el) => el.type === 'node' && el.id === nodeId);
						return node ? { lat: node.lat, lon: node.lon } : null;
					})
					.filter((node) => node !== null) || []
			);
		};

		// Helper function to extract nodes from relations
		const getNodesFromRelation = (relation) => {
			const allNodes = [];
			relation.members?.forEach((member) => {
				if (member.type === 'way' && member.role === 'outer') {
					const way = data.elements.find((el) => el.type === 'way' && el.id === member.ref);
					if (way) {
						allNodes.push(...getNodesFromWay(way));
					}
				}
			});
			return allNodes;
		};

		// Process areas (ways and relations)
		const greenAreas = data.elements
			.filter(
				(element) =>
					(element.type === 'way' && element.nodes) ||
					(element.type === 'relation' && element.members)
			)
			.map((element) => {
				let nodes = [];
				if (element.type === 'way') {
					nodes = getNodesFromWay(element);
				} else if (element.type === 'relation') {
					nodes = getNodesFromRelation(element);
				}

				const category =
					element.tags?.landuse || element.tags?.leisure || element.tags?.natural || 'green';
				const isLargeArea = ['forest', 'park', 'nature_reserve', 'wood', 'meadow'].includes(
					category
				);

				return {
					type: element.type,
					name: element.tags?.name || 'Green space',
					category: category,
					nodes: nodes,
					isLargeArea: isLargeArea
				};
			});

		// Process individual trees
		const trees = data.elements
			.filter((element) => element.type === 'node' && element.tags?.natural === 'tree')
			.map((element) => ({
				type: 'tree',
				lat: element.lat,
				lon: element.lon,
				name: element.tags?.name || 'Tree'
			}));

		console.log('Green areas:', greenAreas);
		console.log('Trees:', trees);

		// Fill in green areas
		for (const area of greenAreas) {
			if (area.nodes.length > 2) {
				if (area.isLargeArea) {
					// Use polygon fill for large areas like forests and parks
					fillPolygon(area.nodes, 0.8);
				} else {
					// For smaller areas, mark perimeter with stronger propagation
					for (let i = 0; i < area.nodes.length; i++) {
						const node = area.nodes[i];
						const x = coordsToGridX(
							node.lat,
							node.lon,
							get(coordinates).latitude,
							get(coordinates).longitude
						);
						const y = coordsToGridY(
							node.lat,
							node.lon,
							get(coordinates).latitude,
							get(coordinates).longitude
						);
						increaseGreenLevel(x, y, 0.7);
					}
				}
			}
		}

		// Fill in individual trees
		for (const tree of trees) {
			const x = coordsToGridX(
				tree.lat,
				tree.lon,
				get(coordinates).latitude,
				get(coordinates).longitude
			);
			const y = coordsToGridY(
				tree.lat,
				tree.lon,
				get(coordinates).latitude,
				get(coordinates).longitude
			);
			increaseGreenLevel(x, y, 0.6);
		}

		greenMap.set(greenMapTmp);
	} catch (error) {
		console.error('Error loading green map:', error);
	}
}

export async function loadActivityMap() {
	try {
		const increaseActivityLevel = (x, y, value) => {
			if (value < 0.05) {
				return;
			}
			if (x >= 0 && x < GRID_ARRAY_SIZE && y >= 0 && y < GRID_ARRAY_SIZE) {
				activityMapTmp[x][y] += value;
				if (activityMapTmp[x][y] > 1) {
					activityMapTmp[x][y] = 1;
				}
				// Light propagation for activity areas
				if (value > 0.3) {
					increaseActivityLevel(x + 1, y, value / 5);
					increaseActivityLevel(x - 1, y, value / 5);
					increaseActivityLevel(x, y + 1, value / 5);
					increaseActivityLevel(x, y - 1, value / 5);
				}
			}
		};

		const overpassQuery = `
[out:json];
(
    // Shopping areas
    way[shop~"mall|supermarket|department_store|bakery|butcher|clothes|convenience|general|gift|jewelry|shoes|sports|toys|electronics|furniture|florist|bookshop|chemist|optician|hairdresser|beauty|bicycle|car|mobile_phone"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
    node[shop~"mall|supermarket|department_store|bakery|butcher|clothes|convenience|general|gift|jewelry|shoes|sports|toys|electronics|furniture|florist|bookshop|chemist|optician|hairdresser|beauty|bicycle|car|mobile_phone"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
    
    // Restaurants and food
    way[amenity~"restaurant|fast_food|cafe|pub|bar|biergarten|food_court|ice_cream"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
    node[amenity~"restaurant|fast_food|cafe|pub|bar|biergarten|food_court|ice_cream"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
    
    // Entertainment and nightlife
    way[amenity~"nightclub|casino|cinema|theatre|arts_centre|community_centre"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
    node[amenity~"nightclub|casino|cinema|theatre|arts_centre|community_centre"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
    
    // Commercial areas
    way[landuse="commercial"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
    way[landuse="retail"](around:600,${get(coordinates).latitude},${get(coordinates).longitude});
);
out body;
>;
out skel qt;
`;

		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `data=${encodeURIComponent(overpassQuery)}`
		});
		const data = await response.json();
		console.log('Activity map response:', data);

		const activityMapTmp = new Array(GRID_ARRAY_SIZE)
			.fill(0)
			.map(() => new Array(GRID_ARRAY_SIZE).fill(0));

		// Helper function to extract nodes from ways
		const getNodesFromWay = (way) => {
			return (
				way.nodes
					?.map((nodeId) => {
						const node = data.elements.find((el) => el.id === nodeId && el.type === 'node');
						return node ? { lat: node.lat, lon: node.lon } : null;
					})
					.filter(Boolean) || []
			);
		};

		// Process commercial areas and shops
		const activityAreas = data.elements
			.filter(
				(element) =>
					(element.type === 'way' || element.type === 'relation') &&
					(element.tags?.landuse === 'commercial' ||
						element.tags?.landuse === 'retail' ||
						element.tags?.shop ||
						element.tags?.amenity)
			)
			.map((element) => {
				const nodes = element.type === 'way' ? getNodesFromWay(element) : [];
				const isLargeArea =
					nodes.length > 10 ||
					element.tags?.landuse === 'commercial' ||
					element.tags?.landuse === 'retail';
				return {
					type: element.tags?.shop || element.tags?.amenity || element.tags?.landuse,
					nodes: nodes,
					isLargeArea: isLargeArea
				};
			});

		// Process individual nodes (shops, restaurants, bars, etc.)
		const activityNodes = data.elements
			.filter((element) => element.type === 'node' && (element.tags?.shop || element.tags?.amenity))
			.map((element) => ({
				type: element.tags?.shop || element.tags?.amenity,
				lat: element.lat,
				lon: element.lon,
				name: element.tags?.name || 'Activity'
			}));

		console.log('Activity areas:', activityAreas);
		console.log('Activity nodes:', activityNodes);

		// Fill in activity areas
		for (const area of activityAreas) {
			if (area.nodes.length > 2) {
				if (area.isLargeArea) {
					// Fill large commercial areas with lighter coverage
					for (let i = 0; i < area.nodes.length; i++) {
						const node = area.nodes[i];
						const x = coordsToGridX(
							node.lat,
							node.lon,
							get(coordinates).latitude,
							get(coordinates).longitude
						);
						const y = coordsToGridY(
							node.lat,
							node.lon,
							get(coordinates).latitude,
							get(coordinates).longitude
						);
						increaseActivityLevel(x, y, 0.4);
					}
				} else {
					// Mark perimeter for smaller areas
					for (let i = 0; i < area.nodes.length; i++) {
						const node = area.nodes[i];
						const x = coordsToGridX(
							node.lat,
							node.lon,
							get(coordinates).latitude,
							get(coordinates).longitude
						);
						const y = coordsToGridY(
							node.lat,
							node.lon,
							get(coordinates).latitude,
							get(coordinates).longitude
						);
						increaseActivityLevel(x, y, 0.6);
					}
				}
			}
		}

		// Fill in individual activity nodes
		for (const node of activityNodes) {
			const x = coordsToGridX(
				node.lat,
				node.lon,
				get(coordinates).latitude,
				get(coordinates).longitude
			);
			const y = coordsToGridY(
				node.lat,
				node.lon,
				get(coordinates).latitude,
				get(coordinates).longitude
			);
			// Higher intensity for individual shops/restaurants/bars
			increaseActivityLevel(x, y, 0.8);
		}

		activityMap.set(activityMapTmp);
	} catch (error) {
		console.error('Error loading activity map:', error);
	}
}
