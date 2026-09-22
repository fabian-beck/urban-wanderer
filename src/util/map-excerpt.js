import {
	PLACE_HERE_DEFAULT_RADIUS,
	STORY_MAP_DETAIL_TAGS,
	STORY_MAP_DETAIL_TEXT_LENGTH,
	STORY_MAP_EXCLUDED_AMENITY_TYPES,
	STORY_MAP_EXCLUDED_AREA_TAGS,
	STORY_MAP_IMMEDIATE_RADIUS,
	STORY_MAP_ON_STREET_DISTANCE,
	STORY_MAP_RADIUS,
	STORY_MAP_RING_LIMITS,
	STORY_MAP_STREET_LIMIT
} from '../constants/core.js';

const METERS_PER_DEGREE = 111320;
const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const ORIENTATIONS = ['N–S', 'NE–SW', 'E–W', 'NW–SE'];
const PRIMARY_KEYS = [
	'amenity',
	'shop',
	'tourism',
	'historic',
	'leisure',
	'natural',
	'landuse',
	'place',
	'man_made',
	'railway',
	'public_transport',
	'waterway',
	'barrier',
	'building'
];
const LINE_KEYS = ['waterway', 'railway', 'barrier'];
const LINE_NATURAL_TYPES = ['coastline', 'cliff', 'tree_row', 'ridge', 'valley'];
const QUALIFIER_TAGS = ['artwork_type', 'memorial', 'castle_type', 'tower:type'];
const NOTABLE_TAGS = ['tourism', 'historic', 'natural', 'waterway', 'railway', 'place'];
const NOTABLE_VALUES = {
	amenity: ['place_of_worship', 'townhall', 'theatre', 'university', 'library', 'fountain'],
	leisure: ['park', 'garden', 'stadium'],
	landuse: ['cemetery']
};
const HIGHWAY_LABELS = {
	motorway: 'motorway',
	trunk: 'trunk road',
	primary: 'main road',
	secondary: 'main road',
	tertiary: 'through road',
	unclassified: 'minor road',
	residential: 'residential street',
	living_street: 'living street',
	pedestrian: 'pedestrian street',
	service: 'service road',
	footway: 'footpath',
	steps: 'steps',
	path: 'path',
	cycleway: 'cycle path',
	track: 'track'
};

function humanize(value) {
	return String(value).replace(/_/g, ' ');
}

function normalizeName(value) {
	return String(value || '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function project(point, origin) {
	const [lat, lon] = point;
	return {
		x: (lon - origin.longitude) * METERS_PER_DEGREE * Math.cos((origin.latitude * Math.PI) / 180),
		y: (lat - origin.latitude) * METERS_PER_DEGREE
	};
}

function bearingOf(x, y) {
	return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

export function compassDirection(bearing) {
	return COMPASS_DIRECTIONS[Math.round(bearing / 45) % 8];
}

function orientationOf(dx, dy) {
	const axis = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 180;
	return ORIENTATIONS[Math.round(axis / 45) % 4];
}

// split a geometry at clipped (null) nodes into continuous projected lines
function projectedLines(geometry, origin) {
	const lines = [];
	let current = [];
	for (const point of geometry || []) {
		if (point) {
			current.push(project(point, origin));
		} else if (current.length) {
			lines.push(current);
			current = [];
		}
	}
	if (current.length) lines.push(current);
	return lines;
}

function nearestOnLines(lines) {
	let nearest = null;
	for (const line of lines) {
		if (line.length === 1) {
			const [p] = line;
			const dist = Math.hypot(p.x, p.y);
			if (!nearest || dist < nearest.dist) nearest = { dist, x: p.x, y: p.y, dx: 0, dy: 0 };
			continue;
		}
		for (let i = 0; i < line.length - 1; i++) {
			const a = line[i];
			const b = line[i + 1];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const lengthSquared = dx * dx + dy * dy;
			const t =
				lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));
			const x = a.x + t * dx;
			const y = a.y + t * dy;
			const dist = Math.hypot(x, y);
			if (!nearest || dist < nearest.dist) nearest = { dist, x, y, dx, dy };
		}
	}
	return nearest;
}

// ray casting on a closed projected ring; the origin is at (0, 0)
function containsOrigin(ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const a = ring[i];
		const b = ring[j];
		if (a.y > 0 !== b.y > 0 && 0 < ((b.x - a.x) * (0 - a.y)) / (b.y - a.y) + a.x) {
			inside = !inside;
		}
	}
	return inside;
}

function isExcluded(tags) {
	if (STORY_MAP_EXCLUDED_AMENITY_TYPES.includes(tags.amenity) && !tags.name) return true;
	return STORY_MAP_EXCLUDED_AREA_TAGS.some((key) => key in tags);
}

function primaryTag(tags) {
	if (tags.highway) return { key: 'highway', value: tags.highway };
	for (const key of PRIMARY_KEYS) {
		if (tags[key] && !(key === 'building' && tags[key] === 'yes')) {
			return { key, value: tags[key] };
		}
	}
	return tags.building ? { key: 'building', value: 'yes' } : null;
}

function isNotable(tags) {
	return (
		NOTABLE_TAGS.some((key) => tags[key]) ||
		Object.entries(NOTABLE_VALUES).some(([key, values]) => values.includes(tags[key]))
	);
}

function descriptorOf(tags, kind) {
	const parts = [];
	if (tags.highway) {
		parts.push(
			kind === 'area' ? 'pedestrian area' : HIGHWAY_LABELS[tags.highway] || humanize(tags.highway)
		);
	}
	for (const key of PRIMARY_KEYS) {
		const value = tags[key];
		if (!value || value === 'yes' || key === 'building') continue;
		parts.push(key === 'landuse' ? `${humanize(value)} area` : humanize(value));
	}
	if (tags.building === 'yes') {
		parts.push('building');
	} else if (tags.building) {
		parts.push(`${humanize(tags.building)} building`);
	}
	for (const key of QUALIFIER_TAGS) {
		if (tags[key]) parts.push(humanize(tags[key]));
	}
	return [...new Set(parts)].join(', ');
}

function detailsOf(tags) {
	const details = [];
	if (tags['addr:street'] && tags['addr:housenumber']) {
		details.push(`at ${tags['addr:street']} ${tags['addr:housenumber']}`);
	}
	for (const key of STORY_MAP_DETAIL_TAGS) {
		const value = tags[key];
		if (!value) continue;
		const text =
			value.length > STORY_MAP_DETAIL_TEXT_LENGTH
				? `${value.slice(0, STORY_MAP_DETAIL_TEXT_LENGTH).trim()}…`
				: value.includes(' ')
					? value
					: humanize(value);
		details.push(`${humanize(key.replace(/^heritage:/, ''))}: ${text}`);
	}
	return details;
}

function kindOf(element, tags) {
	if (element.type === 'node') return 'point';
	if (tags.highway) {
		return tags.area === 'yes' || (element.closed && tags.highway === 'pedestrian')
			? 'area'
			: 'street';
	}
	if (LINE_KEYS.some((key) => tags[key]) || LINE_NATURAL_TYPES.includes(tags.natural)) {
		return 'line';
	}
	if (element.type === 'relation' || element.closed || element.inside) return 'area';
	if (element.point) return 'point';
	return 'line';
}

function localizedName(tags, lang) {
	return tags[`name:${lang}`] || tags.name || '';
}

// Turn the compact Overpass elements into features positioned relative to the
// exact user coordinates: distance, compass direction, orientation, containment
export function buildMapExcerpt(elements, coordinates, lang) {
	const origin = { latitude: coordinates.latitude, longitude: coordinates.longitude };
	const features = [];
	const unnamedBuildings = [];
	for (const element of elements || []) {
		const tags = element.tags || {};
		if (isExcluded(tags)) continue;
		const primary = primaryTag(tags);
		const name = localizedName(tags, lang);
		if (!primary && !name) continue;
		const kind = kindOf(element, tags);
		const geometryLines = element.geometry
			? projectedLines(element.geometry, origin)
			: element.lines
				? element.lines.flatMap((line) => projectedLines(line, origin))
				: element.point
					? [[project(element.point, origin)]]
					: [];
		const nearest = nearestOnLines(geometryLines);
		let inside = Boolean(element.inside);
		if (
			!inside &&
			kind === 'area' &&
			element.type === 'way' &&
			element.closed &&
			element.geometry?.every(Boolean)
		) {
			inside = containsOrigin(geometryLines[0]);
		}
		if (!nearest && !inside) continue;
		const dist = inside ? 0 : nearest.dist;
		if (dist > STORY_MAP_RADIUS) continue;
		const isPlainBuilding =
			!inside && !name && primary?.key === 'building' && element.type === 'way' && element.point;
		if (isPlainBuilding) {
			unnamedBuildings.push({
				buildingType: tags.building,
				dist,
				direction: compassDirection(bearingOf(nearest.x, nearest.y))
			});
			continue;
		}
		features.push({
			id: `${element.type}/${element.id}`,
			kind,
			name,
			names: Object.entries(tags)
				.filter(([key]) => key === 'name' || key.startsWith('name:'))
				.map(([, value]) => value),
			wikidata: tags.wikidata,
			descriptor: descriptorOf(tags, kind),
			details: detailsOf(tags),
			inside,
			dist,
			direction: inside ? null : compassDirection(bearingOf(nearest.x, nearest.y)),
			orientation:
				(kind === 'street' || kind === 'line') && nearest && (nearest.dx || nearest.dy)
					? orientationOf(nearest.dx, nearest.dy)
					: null,
			notable: isNotable(tags)
		});
	}
	return {
		position: { latitude: coordinates.latitude, longitude: coordinates.longitude },
		radius: STORY_MAP_RADIUS,
		features,
		unnamedBuildings
	};
}

function ringOf(dist) {
	if (dist <= STORY_MAP_IMMEDIATE_RADIUS) return 'immediate';
	if (dist <= PLACE_HERE_DEFAULT_RADIUS) return 'here';
	return 'buffer';
}

function selectRing(features, ring) {
	const limit = STORY_MAP_RING_LIMITS[ring];
	const candidates = features.filter((feature) => ringOf(feature.dist) === ring);
	const weight = (feature) => (feature.name ? 2 : 0) + (feature.notable ? 2 : 0);
	const selected =
		ring === 'immediate'
			? [...candidates].sort((a, b) => a.dist - b.dist).slice(0, limit)
			: [...candidates].sort((a, b) => weight(b) - weight(a) || a.dist - b.dist).slice(0, limit);
	return selected.sort((a, b) => a.dist - b.dist);
}

function formatDistance(dist) {
	if (dist < 10) return `${Math.max(1, Math.round(dist))} m`;
	return `${Math.round(dist / 5) * 5} m`;
}

function formatFeature(feature, placeTitleByKey) {
	const label = feature.name
		? `${feature.name} (${feature.descriptor || feature.kind})`
		: feature.descriptor || feature.kind;
	const parts = [];
	if (feature.inside) {
		parts.push(feature.kind === 'street' ? '⌖ is on it' : '⌖ is inside');
	} else {
		parts.push(`${formatDistance(feature.dist)} ${feature.direction}`);
		if (feature.kind === 'area') parts.push('to nearest edge');
	}
	if (feature.orientation) parts.push(`runs ${feature.orientation}`);
	const matchedTitle = placeTitleByKey && matchPlaceTitle(feature, placeTitleByKey);
	const annotation = matchedTitle ? ` [= listed place "${matchedTitle}"]` : '';
	const details = feature.details.length ? `; ${feature.details.join('; ')}` : '';
	return `- ${label}${annotation} — ${parts.join(', ')}${details}`;
}

function matchPlaceTitle(feature, placeTitleByKey) {
	if (feature.wikidata && placeTitleByKey.has(`wikidata:${feature.wikidata}`)) {
		return placeTitleByKey.get(`wikidata:${feature.wikidata}`);
	}
	for (const name of feature.names) {
		const title = placeTitleByKey.get(`name:${normalizeName(name)}`);
		if (title) return title;
	}
	return null;
}

function indexPlaceTitles(places) {
	const index = new Map();
	for (const place of places || []) {
		if (place.wikidata) index.set(`wikidata:${place.wikidata}`, place.title);
		const titles = [place.title, ...(place.alternateTitles || [])];
		const match = /^(.*?)\s*\((.*)\)$/.exec(place.title || '');
		if (match) titles.push(match[1], match[2]);
		for (const title of titles) {
			const key = `name:${normalizeName(title)}`;
			if (title && !index.has(key)) index.set(key, place.title);
		}
	}
	return index;
}

function formatUnnamedBuildings(unnamedBuildings) {
	const near = unnamedBuildings.filter((building) => building.dist <= STORY_MAP_IMMEDIATE_RADIUS);
	if (!near.length) return `- no further buildings within ${STORY_MAP_IMMEDIATE_RADIUS} m of ⌖`;
	const counts = new Map();
	for (const building of near) {
		const type = building.buildingType === 'yes' ? 'unspecified' : humanize(building.buildingType);
		counts.set(type, (counts.get(type) || 0) + 1);
	}
	const nearest = near.reduce((best, building) => (building.dist < best.dist ? building : best));
	const typeList = [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([type, count]) => `${type} ${count}`)
		.join(', ');
	return `- ${near.length} unnamed ${near.length === 1 ? 'building' : 'buildings'} within ${STORY_MAP_IMMEDIATE_RADIUS} m of ⌖ (${typeList}); nearest ${formatDistance(nearest.dist)} ${nearest.direction}`;
}

// the same named feature can arrive as way, relation and is_in area; keep the closest one
function dedupeByName(features) {
	const seen = new Set();
	return [...features]
		.sort((a, b) => a.dist - b.dist)
		.filter((feature) => {
			if (!feature.name) return true;
			const key = normalizeName(feature.name);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

// Prompt text: rings of features around the marked position, streets first
export function formatMapExcerpt(excerpt, places = []) {
	if (!excerpt) return '';
	const placeTitleByKey = indexPlaceTitles(places);
	const { position, unnamedBuildings } = excerpt;
	const features = dedupeByName(excerpt.features.filter((feature) => feature.kind !== 'street'));
	const insideFeatures = features
		.filter((feature) => feature.inside)
		.sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1));
	const streets = [];
	const seenStreets = new Set();
	for (const feature of excerpt.features
		.filter((feature) => feature.kind === 'street')
		.sort((a, b) => a.dist - b.dist)) {
		const key = feature.name ? normalizeName(feature.name) : `${feature.descriptor}:${feature.id}`;
		if (seenStreets.has(key)) continue;
		seenStreets.add(key);
		streets.push({ ...feature, inside: feature.dist <= STORY_MAP_ON_STREET_DISTANCE });
		if (streets.length >= STORY_MAP_STREET_LIMIT) break;
	}
	const others = features.filter((feature) => !feature.inside);
	const rings = [
		{
			title: `Within ${STORY_MAP_IMMEDIATE_RADIUS} m of ⌖ (immediate surroundings)`,
			features: selectRing(others, 'immediate')
		},
		{
			title: `${STORY_MAP_IMMEDIATE_RADIUS}–${PLACE_HERE_DEFAULT_RADIUS} m from ⌖`,
			features: selectRing(others, 'here')
		},
		{
			title: `${PLACE_HERE_DEFAULT_RADIUS}–${excerpt.radius} m from ⌖ (outer buffer, background only)`,
			features: selectRing(others, 'buffer')
		}
	];
	const formatList = (list, emptyText) =>
		list.length
			? list.map((feature) => formatFeature(feature, placeTitleByKey)).join('\n')
			: emptyText;
	return `The user's exact position is marked ⌖ at latitude ${position.latitude.toFixed(5)}, longitude ${position.longitude.toFixed(5)}.
Every entry gives the straight-line distance and compass direction (N, NE, E, SE, S, SW, W, NW) from ⌖; for streets and areas this is the nearest point of their mapped outline. Names are OpenStreetMap names.

## ⌖ is inside / on
${formatList(insideFeatures, '- no mapped area contains ⌖')}

## Streets and paths around ⌖
${formatList(streets, '- no mapped streets nearby')}

## ${rings[0].title}
${formatList(rings[0].features, '- no mapped features')}
${formatUnnamedBuildings(unnamedBuildings)}

## ${rings[1].title}
${formatList(rings[1].features, '- no mapped features')}

## ${rings[2].title}
${formatList(rings[2].features, '- no mapped features')}`;
}

// short relative position of a place for the place lists in prompts
export function formatRelativePosition(place, coordinates) {
	if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lon) || !coordinates) {
		return Number.isFinite(place?.dist) ? `${Math.round(place.dist)} m` : '';
	}
	const { x, y } = project([place.lat, place.lon], coordinates);
	return `${Math.round(Math.hypot(x, y))} m ${compassDirection(bearingOf(x, y))}`;
}
