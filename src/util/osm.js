import { GRID_ARRAY_SIZE, GRID_CELL_SIZE, OSM_SEARCH_RADIUS } from '../constants/core.js';
import { getPerformanceNow, logPerformance } from './performance.js';
import { createLogger } from './logger.js';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const CACHE_PREFIX = 'osm_cache_';
const MAX_CACHE_ENTRIES = 50;
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const OVERPASS_MIN_REQUEST_INTERVAL = 1500;
const OVERPASS_DEFAULT_COOLDOWN = 60 * 1000;

let overpassQueue = Promise.resolve();
let overpassLastRequestAt = 0;
let overpassCooldownUntil = 0;
const overpassRequestsInFlight = new Map();
const logger = createLogger('osm');

function getCacheKey(coordinates, queryType, radius) {
	const lat = coordinates.latitude.toFixed(3);
	const lon = coordinates.longitude.toFixed(3);
	return `${CACHE_PREFIX}${queryType}_${lat}_${lon}_${radius}`;
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(header) {
	if (!header) return null;

	const seconds = Number(header);
	if (Number.isFinite(seconds)) {
		return Math.max(0, seconds * 1000);
	}

	const retryDate = Date.parse(header);
	if (!Number.isNaN(retryDate)) {
		return Math.max(0, retryDate - Date.now());
	}

	return null;
}

async function runOverpassRequest(overpassQuery) {
	const now = Date.now();
	if (now < overpassCooldownUntil) {
		const secondsRemaining = Math.ceil((overpassCooldownUntil - now) / 1000);
		throw new Error(`Overpass API cooling down after rate limit; retry in ${secondsRemaining}s`);
	}

	const delay = Math.max(0, OVERPASS_MIN_REQUEST_INTERVAL - (now - overpassLastRequestAt));
	if (delay > 0) {
		await wait(delay);
		logPerformance('Overpass throttle wait', delay);
	}

	const requestStartedAt = getPerformanceNow();
	const response = await fetch(OVERPASS_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: `data=${encodeURIComponent(overpassQuery)}`
	});
	overpassLastRequestAt = Date.now();

	if (response.status === 429) {
		const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
		const cooldown = retryAfter ?? OVERPASS_DEFAULT_COOLDOWN;
		overpassCooldownUntil = Date.now() + cooldown;
		throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
	}

	if (!response.ok) {
		throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
	}

	const text = await response.text();
	logPerformance('Overpass request and read', getPerformanceNow() - requestStartedAt, {
		status: response.status,
		bytes: text.length
	});
	try {
		return JSON.parse(text);
	} catch {
		logger.error('Overpass JSON parse failed', { responsePreview: text.substring(0, 200) });
		throw new Error('Invalid JSON response from Overpass API');
	}
}

function loadOverpassJson(overpassQuery) {
	const requestKey = overpassQuery.replace(/\s+/g, ' ').trim();
	const inFlight = overpassRequestsInFlight.get(requestKey);
	if (inFlight) {
		logger.debug('Reusing in-flight Overpass request');
		return inFlight;
	}

	const queuedAt = getPerformanceNow();
	const request = overpassQueue.then(() => {
		const queueWaitMs = getPerformanceNow() - queuedAt;
		if (queueWaitMs > 10) {
			logPerformance('Overpass queue wait', queueWaitMs);
		}
		return runOverpassRequest(overpassQuery);
	});
	overpassQueue = request.catch(() => {});
	overpassRequestsInFlight.set(requestKey, request);
	request.then(
		() => overpassRequestsInFlight.delete(requestKey),
		() => overpassRequestsInFlight.delete(requestKey)
	);
	return request;
}

function getCachedData(key) {
	try {
		if (typeof localStorage === 'undefined') {
			logger.debug('Cache unavailable');
			return null;
		}

		const cached = localStorage.getItem(key);
		if (cached) {
			const parsed = JSON.parse(cached);
			const age = Date.now() - parsed.timestamp;
			const ageMinutes = (age / 60000).toFixed(1);

			if (age < CACHE_DURATION) {
				const dataLength = Array.isArray(parsed.data) ? parsed.data.length : 'N/A';
				logger.debug('Cache hit', { key, ageMinutes, items: dataLength });
				return JSON.parse(JSON.stringify(parsed.data));
			} else {
				logger.debug('Cache expired', { key, ageMinutes });
				localStorage.removeItem(key);
			}
		} else {
			logger.debug('Cache miss', { key });
		}
	} catch (error) {
		logger.warn('Cache read failed', error);
	}
	return null;
}

function setCachedData(key, data) {
	try {
		if (typeof localStorage === 'undefined') {
			logger.debug('Cache write skipped');
			return;
		}

		const cacheEntry = {
			data,
			timestamp: Date.now()
		};

		const dataLength = Array.isArray(data) ? data.length : 'N/A';
		localStorage.setItem(key, JSON.stringify(cacheEntry));
		logger.debug('Cache stored', { key, items: dataLength });

		cleanupOldCacheEntries();
	} catch (error) {
		logger.warn('Cache write failed', error);
		if (error.name === 'QuotaExceededError') {
			logger.warn('Cache quota exceeded; cleaning old entries');
			cleanupOldCacheEntries();
		}
	}
}

function cleanupOldCacheEntries() {
	try {
		if (typeof localStorage === 'undefined') return;

		const cacheKeys = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(CACHE_PREFIX)) {
				const cached = localStorage.getItem(key);
				if (cached) {
					const parsed = JSON.parse(cached);
					cacheKeys.push({ key, timestamp: parsed.timestamp });
				}
			}
		}

		if (cacheKeys.length > MAX_CACHE_ENTRIES) {
			cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
			const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES);
			toRemove.forEach((entry) => localStorage.removeItem(entry.key));
		}
	} catch (error) {
		logger.warn('Cache cleanup failed', error);
	}
}

export async function loadOsmPlaces(coordinates) {
	try {
		const radius = OSM_SEARCH_RADIUS;
		const cacheKey = getCacheKey(coordinates, 'places', radius);
		const cached = getCachedData(cacheKey);
		if (cached) {
			logger.info('Places loaded from cache', { places: cached.length });
			return cached;
		}
		logger.info('Loading places from Overpass');
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
    relation[waterway~"${waterway}"](around:${radius},${coordinates.latitude},${coordinates.longitude});

    // Search for amenities
    node[amenity~"${amenities}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    way[amenity~"${amenities}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    relation[amenity~"${amenities}"](around:${radius},${coordinates.latitude},${coordinates.longitude});

    // Search for tourism-related points of interest
    node[tourism~"${tourism}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    way[tourism~"${tourism}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    relation[tourism~"${tourism}"](around:${radius},${coordinates.latitude},${coordinates.longitude});

    // Search for historic landmarks such as monuments and memorials
    node[historic~"${historic}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    way[historic~"${historic}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    relation[historic~"${historic}"](around:${radius},${coordinates.latitude},${coordinates.longitude});

    // Search for man-made structures such as statues
    node[man_made~"${man_made}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    way[man_made~"${man_made}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    relation[man_made~"${man_made}"](around:${radius},${coordinates.latitude},${coordinates.longitude});

    // Search for leisure facilities such as parks and gardens
    node[leisure~"${leisure}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    way[leisure~"${leisure}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
    relation[leisure~"${leisure}"](around:${radius},${coordinates.latitude},${coordinates.longitude});
);
out center;
>;
out skel qt;
`;
		const data = await loadOverpassJson(overpassQuery);

		logger.debug('Places response', { elements: data.elements?.length || 0, data });
		const places = data.elements
			.filter((element) => element.tags?.name)
			.map((element) => {
				const tags = element.tags;
				const lat = element.lat ?? element.center?.lat;
				const lon = element.lon ?? element.center?.lon;
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
					lat,
					lon,
					dist:
						Number.isFinite(lat) && Number.isFinite(lon)
							? haversineDistance(coordinates.latitude, coordinates.longitude, lat, lon)
							: Infinity
				};
			});

		logger.info('Places loaded', { places: places.length });
		logger.debug('Places parsed', { places });
		setCachedData(cacheKey, places);
		return places;
	} catch (error) {
		logger.error('Places load failed', error);
		return []; // Return empty array on error
	}
}

export async function loadOsmAddressData(coords, lang) {
	const response = await fetch(
		`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1&accept-language=${lang}`
	);
	const data = await response.json();
	return simplifyOsmAddressData(data);
}

function normalizeAddressPart(value) {
	if (!value || typeof value !== 'string') {
		return null;
	}
	const normalized = value.trim();
	return normalized || null;
}

function pickAddressPart(address, keys) {
	for (const key of keys) {
		const value = normalizeAddressPart(address?.[key]);
		if (value) {
			return value;
		}
	}
	return null;
}

export function simplifyOsmAddressData(data) {
	const originalAddress = data?.address || {};
	const town = pickAddressPart(originalAddress, ['town', 'city', 'municipality']);
	const village = pickAddressPart(originalAddress, ['village', 'hamlet', 'isolated_dwelling']);
	const suburb = pickAddressPart(originalAddress, ['suburb', 'neighbourhood', 'quarter']);
	const road = pickAddressPart(originalAddress, [
		'road',
		'pedestrian',
		'footway',
		'path',
		'residential',
		'square'
	]);
	const county = pickAddressPart(originalAddress, ['county']);
	const state = pickAddressPart(originalAddress, ['state', 'state_district', 'region']);
	const country = pickAddressPart(originalAddress, ['country']);

	const displayParts = [];
	[road, suburb, town || village, county, state, country].forEach((part) => {
		if (!part) {
			return;
		}
		if (!displayParts.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
			displayParts.push(part);
		}
	});

	return {
		...data,
		display_name: displayParts.join(', ') || data?.display_name || '',
		address: {
			...originalAddress,
			town,
			village,
			suburb,
			road,
			county,
			state,
			country
		}
	};
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
	const baseX = latLonToX(lat, lon, centerLat, centerLon) / GRID_CELL_SIZE + GRID_CENTER_OFFSET;
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
export async function loadOsmWaterMap(coordinates) {
	try {
		const cacheKey = getCacheKey(coordinates, 'watermap', OSM_SEARCH_RADIUS);
		const cached = getCachedData(cacheKey);
		if (cached) return cached;

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
    relation[waterway~"river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    way[waterway~"river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    node[waterway~"river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
);
out body;
>;
out skel qt;
`;
		const data = await loadOverpassJson(overpassQuery);

		logger.debug('Water map response', { elements: data.elements?.length || 0, data });
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
		logger.info('Water map data loaded', { polylines: waterPolylines.length });
		logger.debug('Water polylines', { waterPolylines });
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
				const x1 = coordsToGridX(lat1, lon1, coordinates.latitude, coordinates.longitude);
				const y1 = coordsToGridY(lat1, lon1, coordinates.latitude, coordinates.longitude);
				const x2 = coordsToGridX(lat2, lon2, coordinates.latitude, coordinates.longitude);
				const y2 = coordsToGridY(lat2, lon2, coordinates.latitude, coordinates.longitude);

				// Draw thick line between the two points
				drawThickLine(x1, y1, x2, y2, waterwayRadius, waterIntensity);
			}
		}
		setCachedData(cacheKey, waterMapTmp);
		return waterMapTmp;
	} catch (error) {
		logger.error('Water map load failed', error);
		return [];
	}
}

// green map
export async function loadOsmGreenMap(coordinates) {
	try {
		const cacheKey = getCacheKey(coordinates, 'greenmap', OSM_SEARCH_RADIUS);
		const cached = getCachedData(cacheKey);
		if (cached) return cached;

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
					x: coordsToGridX(node.lat, node.lon, coordinates.latitude, coordinates.longitude),
					y: coordsToGridY(node.lat, node.lon, coordinates.latitude, coordinates.longitude)
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
    relation[landuse~"forest|meadow|orchard|vineyard|grass|recreation_ground|village_green"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    way[landuse~"forest|meadow|orchard|vineyard|grass|recreation_ground|village_green"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    
    relation[leisure~"park|nature_reserve|garden|common|recreation_ground|pitch|playground"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    way[leisure~"park|nature_reserve|garden|common|recreation_ground|pitch|playground"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    
    relation[natural~"wood|scrub|grassland|heath|moor|wetland|marsh|fell|bare_rock|scree|shingle|sand|beach|coastline|tree_row"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    way[natural~"wood|scrub|grassland|heath|moor|wetland|marsh|fell|bare_rock|scree|shingle|sand|beach|coastline|tree_row"](around:${OSM_SEARCH_RADIUS},${coordinates.latitude},${coordinates.longitude});
    
    // Individual trees
    node[natural="tree"](around:400,${coordinates.latitude},${coordinates.longitude});
);
out body;
>;
out skel qt;
`;
		const data = await loadOverpassJson(overpassQuery);

		logger.debug('Green map response', { elements: data.elements?.length || 0, data });

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

		logger.info('Green map data loaded', { areas: greenAreas.length, trees: trees.length });
		logger.debug('Green map features', { greenAreas, trees });

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
							coordinates.latitude,
							coordinates.longitude
						);
						const y = coordsToGridY(
							node.lat,
							node.lon,
							coordinates.latitude,
							coordinates.longitude
						);
						increaseGreenLevel(x, y, 0.7);
					}
				}
			}
		}

		// Fill in individual trees
		for (const tree of trees) {
			const x = coordsToGridX(tree.lat, tree.lon, coordinates.latitude, coordinates.longitude);
			const y = coordsToGridY(tree.lat, tree.lon, coordinates.latitude, coordinates.longitude);
			increaseGreenLevel(x, y, 0.6);
		}

		setCachedData(cacheKey, greenMapTmp);
		return greenMapTmp;
	} catch (error) {
		logger.error('Green map load failed', error);
		return [];
	}
}

export async function loadOsmActivityMap(coordinates) {
	try {
		const cacheKey = getCacheKey(coordinates, 'activitymap', 600);
		const cached = getCachedData(cacheKey);
		if (cached) return cached;

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
    way[shop~"mall|supermarket|department_store|bakery|butcher|clothes|convenience|general|gift|jewelry|shoes|sports|toys|electronics|furniture|florist|bookshop|chemist|optician|hairdresser|beauty|bicycle|car|mobile_phone"](around:600,${coordinates.latitude},${coordinates.longitude});
    node[shop~"mall|supermarket|department_store|bakery|butcher|clothes|convenience|general|gift|jewelry|shoes|sports|toys|electronics|furniture|florist|bookshop|chemist|optician|hairdresser|beauty|bicycle|car|mobile_phone"](around:600,${coordinates.latitude},${coordinates.longitude});
    
    // Restaurants and food
    way[amenity~"restaurant|fast_food|cafe|pub|bar|biergarten|food_court|ice_cream"](around:600,${coordinates.latitude},${coordinates.longitude});
    node[amenity~"restaurant|fast_food|cafe|pub|bar|biergarten|food_court|ice_cream"](around:600,${coordinates.latitude},${coordinates.longitude});
    
    // Entertainment and nightlife
    way[amenity~"nightclub|casino|cinema|theatre|arts_centre|community_centre"](around:600,${coordinates.latitude},${coordinates.longitude});
    node[amenity~"nightclub|casino|cinema|theatre|arts_centre|community_centre"](around:600,${coordinates.latitude},${coordinates.longitude});
    
    // Commercial areas
    way[landuse="commercial"](around:600,${coordinates.latitude},${coordinates.longitude});
    way[landuse="retail"](around:600,${coordinates.latitude},${coordinates.longitude});
);
out body;
>;
out skel qt;
`;

		const data = await loadOverpassJson(overpassQuery);

		logger.debug('Activity map response', { elements: data.elements?.length || 0, data });

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

		logger.info('Activity map data loaded', {
			areas: activityAreas.length,
			nodes: activityNodes.length
		});
		logger.debug('Activity map features', { activityAreas, activityNodes });

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
							coordinates.latitude,
							coordinates.longitude
						);
						const y = coordsToGridY(
							node.lat,
							node.lon,
							coordinates.latitude,
							coordinates.longitude
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
							coordinates.latitude,
							coordinates.longitude
						);
						const y = coordsToGridY(
							node.lat,
							node.lon,
							coordinates.latitude,
							coordinates.longitude
						);
						increaseActivityLevel(x, y, 0.6);
					}
				}
			}
		}

		// Fill in individual activity nodes
		for (const node of activityNodes) {
			const x = coordsToGridX(node.lat, node.lon, coordinates.latitude, coordinates.longitude);
			const y = coordsToGridY(node.lat, node.lon, coordinates.latitude, coordinates.longitude);
			// Higher intensity for individual shops/restaurants/bars
			increaseActivityLevel(x, y, 0.8);
		}

		setCachedData(cacheKey, activityMapTmp);
		return activityMapTmp;
	} catch (error) {
		logger.error('Activity map load failed', error);
		return [];
	}
}

export function clearOsmCache() {
	try {
		if (typeof localStorage === 'undefined') return;

		const keysToRemove = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(CACHE_PREFIX)) {
				keysToRemove.push(key);
			}
		}

		keysToRemove.forEach((key) => localStorage.removeItem(key));
		logger.info('Cache cleared', { entries: keysToRemove.length });
	} catch (error) {
		logger.error('Cache clear failed', error);
	}
}
