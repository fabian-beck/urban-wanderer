# Data Processing Pipeline

This document describes the complete data processing pipeline of Urban Wanderer — how raw GPS coordinates become classified, rated, enriched place information with AI-generated narratives.

---

## Overview

The pipeline is orchestrated by two Svelte stores in [src/stores.js](../src/stores.js): `coordinates` and `places`. When `updateLocation()` is called, it sequentially updates both stores. The places store drives a multi-stage pipeline; three map stores update in parallel and independently in the background.

```
updateLocation(coords?)
├── coordinates.update()          # Stage 1: location + address
└── places.update()               # Stages 2–7 (sequential)
    ├── [background] loadOsmWaterMap()
    ├── [background] loadOsmGreenMap()
    ├── [background] loadOsmActivityMap()
    ├── [parallel]  loadWikipediaPlaces() + loadOsmPlaces()   # Stage 2
    ├── mergePlaces()                                          # Stage 3
    ├── groupDuplicatePlaces()                                 # Stage 4
    ├── loadWikipediaExtracts()                                # Stage 5
    ├── analyzePlaces()                                        # Stage 6
    ├── rate()                                                 # Stage 7
    └── [background] pregenerateStoryInBackground()
            ├── loadMetadata()                                 # Stage 8
            └── generateStory()                                # Stage 9
```

---

## Stage 1 — Location Acquisition and Address Resolution

**Source:** [src/stores.js](../src/stores.js) `createCoordinates()`  
**API:** Capacitor Geolocation, OSM Nominatim

`coordinates.update()` accepts three input modes:

| Input                   | Behavior                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `null`                  | GPS via `Geolocation.getCurrentPosition({ enableHighAccuracy: true })`                                                              |
| `'random'`              | Calls `getRandomWikipediaPlaceCoordinates()` — polls `/api/rest_v1/page/random/summary` until a page with `coordinates` is returned |
| `{latitude, longitude}` | Uses provided coordinates directly (e.g., from place name search)                                                                   |

After coordinates are determined, **OSM Nominatim** reverse-geocodes them:

```
GET https://nominatim.openstreetmap.org/reverse
    ?format=json&lat=…&lon=…&zoom=18&addressdetails=1&accept-language={lang}
```

The response is decomposed into a rule-based, reliability-focused subset:

- `address` — simplified display string built from stable components (`road`, `suburb`, `town|village`, `county`, `state`, `country`)
- `town` — first available from `town`, `city`, `municipality`
- `village` — first available from `village`, `hamlet`, `isolated_dwelling`
- `suburb` — first available from `suburb`, `neighbourhood`, `quarter`
- `road` — first available from `road`, `pedestrian`, `footway`, `path`, `residential`, `square`

District-level fields like `city_district` are intentionally excluded from this subset to reduce noisy or misleading locality hints in downstream AI prompts.

These address components are used downstream both for Wikipedia name searches and for the `placesSurrounding` derived store.

For **place name search** (`searchForPlace(placeName)`), `searchWikipediaPlaceCoordinates()` runs an OpenSearch against Wikipedia, then checks each result for `prop=coordinates` until one is found within 10 km (calculated as Euclidean distance × 111139 m/degree).

---

## Stage 2 — Parallel Place Data Fetching

Both Wikipedia and OSM data are fetched concurrently via `Promise.allSettled()`. Failures in either source are isolated — the other source still proceeds.

### 2a. Wikipedia Places

**Source:** [src/util/wikipedia.js](../src/util/wikipedia.js) `loadWikipediaPlaces()`

#### Geosearch (per configured source language)

For each language in `preferences.sourceLanguages` (default: `['de', 'en']`), a geosearch runs concurrently:

```
GET https://{lang}.wikipedia.org/w/api.php
    ?action=query&list=geosearch
    &gscoord={lat}|{lon}
    &gsradius={radius}   (default 500 m, user-configurable)
    &gslimit=40          (nArticles constant)
    &format=json&origin=*
```

Each result gets its `lang` property set to the searched language. Title post-processing strips parenthetical content (`/\s*\(.*?\)\s*/g`) and text after commas (`split(',')[0]`).

#### Name-based fallback searches

After geosearch, additional searches target the address components. For each of `town`, `village (town)`, `suburb (town)`, and `road (town)`, `wikipediaNameSearchForPlace()` runs a title search:

```
GET https://{lang}.wikipedia.org/w/api.php
    ?action=query&list=search&srsearch={name}&srlimit=1
```

For each search result, coordinates are fetched via `prop=coordinates&pageids={pageid}`. A result is accepted only if:

- It has coordinates
- The coordinates are within 10 km of the current location
- The result title and the searched name share a substring relationship (case-insensitive)

Accepted results undergo the same title cleanup (strip parentheses, split on comma).

### 2b. OSM Places via Overpass API

**Source:** [src/util/osm.js](../src/util/osm.js) `loadOsmPlaces()`  
**Search radius:** `OSM_SEARCH_RADIUS` from [src/constants/core.js](../src/constants/core.js)  
**Cache:** 15-minute TTL, key format `osm_cache_places_{lat3dp}_{lon3dp}_{radius}`

The Overpass query targets six OSM tag categories:

| Category   | Selected values                                                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `waterway` | river, stream, canal, drain, ditch, weir, dam, waterfall, lock, dock, boatyard, sluice_gate, water_point                                                                               |
| `amenity`  | museum, school, college, university, library, place_of_worship                                                                                                                         |
| `tourism`  | viewpoint, attraction, mall, zoo, theme_park, aquarium, gallery, artwork, memorial, museum, theatre, cinema                                                                            |
| `historic` | monument, memorial, ruins, castle, church, tomb, battlefield, fort, city_gate, citywalls, gate, archaeological_site                                                                    |
| `man_made` | statue, sculpture, obelisk, stone, cross, wayside_cross, wayside_shrine, shelter, tower, water_tower, chimney, bridge, tunnel, mine, adit, bunker, silo, tank, reservoir, and variants |
| `leisure`  | park, nature_reserve, sports_centre, stadium                                                                                                                                           |

For each element type (node, way, relation) × each category, the query uses `around:{radius},{lat},{lon}`. Only elements with a `name` tag are kept. The result set is mapped to place objects:

```js
{
	(title, // name tag, stripped of parentheses and comma-separated text
		description, // tags.description
		type, // first matching tag value (waterway|amenity|tourism|…)
		url, // tags['contact:website'] || tags.website
		wikipedia, // tags.wikipedia (e.g. "de:Bamberger Dom")
		wikidata, // tags.wikidata (e.g. "Q123456")
		lat,
		lon, // element coordinates or Overpass center for ways/relations
		dist); // Haversine distance in meters, or Infinity when no usable point exists
}
```

Successful OSM responses are cached even when the result set is empty, so sparse locations do not repeatedly hit Overpass. On `QuotaExceededError`, the cleanup routine removes the oldest entries until the total drops to 50.

All Overpass requests go through `loadOverpassJson()`:

- Requests are serialized through a shared queue with at least 1.5 s between request completions and the next start.
- Identical in-flight Overpass queries reuse the same promise instead of starting duplicate HTTP requests.
- HTTP 429 responses set a global cooldown, using `Retry-After` when provided and falling back to 60 s.

---

## Stage 3 — Merging Wikipedia and OSM Data

**Source:** [src/stores.js](../src/stores.js) `mergePlaces()`

Wikipedia places are enriched with OSM data when titles match exactly:

- `type` is set from the OSM record
- `url` is set from the OSM record
- `wikipedia` is set from the OSM record (if OSM has a `wikipedia` tag)

Additionally, distances below 100 m are zeroed (`place.dist = 0`).

OSM places that have no matching title in the Wikipedia set are appended to the list.

---

## Stage 4 — Translation and Deduplication

**Source:** [src/util/ai-translation.js](../src/util/ai-translation.js) `groupDuplicatePlaces()`

This stage runs in two sub-steps.

### 4a. AI Translation

For each place, `translatePlaceName()` is called concurrently via `Promise.all()`. Translation is skipped if:

- Only one source language is configured (`!hasMultipleSourceLanguages`), AND
- The place's language already matches the target language

When translation is triggered, the model is prompted to translate only place names that can be rendered in the target language, with a strong bias toward returning the original. Uses `json_schema` structured output:

```json
{ "title": "original", "translation": "translated" }
```

**Model:** simple (default: gpt-5.4-mini), **reasoning effort:** low

If the translation differs from the original title, the place title is rewritten to `"{translation} ({original})"`.

### 4b. Deduplication via Levenshtein Distance

Places are iterated sequentially. For each place, all previously accepted places are checked for name similarity using `placesNameIsSimilar()`:

**Pre-processing steps:**

1. Extract all digit sequences; if either name has digits, compare digit content — different digits → not similar
2. Lowercase both names
3. Strip content in parentheses (`/ *\([^)]*\) */g`)
4. Strip non-alphanumeric characters (`/[^a-z0-9]/g`)
5. Remove the town name from both strings if the string is more than 5 characters longer than the town name

**Distance thresholds:**

- If one cleaned name is a substring of the other (**substring-like**): `allowedDistance = max(3, lengthDiff + floor(minLength × 0.1))`
- Otherwise (**non-substring**): `allowedDistance = max(2, floor(minLength × 0.15))`

Levenshtein distance is computed via standard DP. A match occurs when `name1 === name2 || distance < allowedDistance`.

When a duplicate is found:

- If the _previous_ (already-accepted) place has `lang === preferences.lang`, the new place is skipped
- Otherwise, the previous place is replaced by the new one

---

## Stage 5 — Wikipedia Extract Loading

**Source:** [src/util/wikipedia.js](../src/util/wikipedia.js) `loadWikipediaExtracts()`

All places run concurrently. For places with a `pageid`:

```
GET https://{place.lang || lang}.wikipedia.org/w/api.php
    ?action=query&format=json&pageids={pageid}
    &prop=extracts&exintro=1&explaintext=1
```

For places with a `wikipedia` tag (OSM-only places, no `pageid`):

- The tag format is `{lang}:{title}` (e.g., `de:Bamberger Dom`)
- Wikipedia references containing `#` (section anchors) are skipped entirely — the extract would not relate specifically to the place
- Otherwise the lang and title are split and the API called with `titles={title}`

The extracted text is stored as `place.description`.

---

## Stage 6 — AI Place Analysis

**Source:** [src/util/ai-analysis.js](../src/util/ai-analysis.js) `analyzePlaces()`  
**Model:** simple (default: gpt-5.4-mini)
**Reasoning effort:** low
**Cache:** localStorage, key = `place.title`, TTL = 7 days

Each place is analyzed independently and concurrently. Cache is loaded once at module initialization; expired entries are filtered on load. Uncached places are sent to the AI simultaneously via `Promise.all()`.

The system prompt presents:

- All available `CLASSES` with descriptions
- All available `LABELS` with descriptions
- The `IMPORTANCE` scale (1–5) with qualitative descriptors for what drives values up (landmark, uniqueness, historical significance, dominance of perceived environment) and down (generic business, administrative district, large geographic feature, demolished/inaccessible)

The user message is: `"* {title} ({type}): {snippet || description}"`

Expected JSON output (via `json_object` format):

```json
{ "cls": "CLASSNAME", "labels": ["LABEL1", "LABEL2"], "importance": 3 }
```

On parse failure, the fallback is `{ cls: 'other', labels: [], importance: 0 }`.

**Post-analysis filtering:** Places whose `cls` belongs to a class with `nonGeo: true` are removed from the list. These represent non-geographic entities (organizations, concepts, etc.) that entered from Wikipedia.

Available labels (10 total):

| Value          | Covers                                 |
| -------------- | -------------------------------------- |
| ACTIVITIES     | Shopping, food, entertainment, leisure |
| ARCHITECTURE   | Buildings, monuments, landmarks        |
| CULTURE        | Museums, galleries, cultural centers   |
| EDUCATION      | Schools, universities, libraries       |
| GEOGRAPHY      | Natural formations, landscapes         |
| HISTORY        | Historical sites, memorials            |
| NATURE         | Parks, gardens, natural areas          |
| RELIGION       | Churches, temples, places of worship   |
| SPORTS         | Sports facilities, stadiums            |
| TRANSPORTATION | Stations, airports, infrastructure     |

---

## Stage 7 — Star Rating

**Source:** [src/stores.js](../src/stores.js) `rate()`

Each place receives a `stars` score (0–5) and a `starDescriptions` array explaining each contribution:

| Condition                                  | Stars | Description                          |
| ------------------------------------------ | ----- | ------------------------------------ |
| `place.wikipedia` or `place.pageid` exists | +1    | "has a Wikipedia article"            |
| `place.importance === 4`                   | +1    | "is important for the location"      |
| `place.importance === 5`                   | +2    | "is very important for the location" |
| Some place labels match selected interests | +1    | "matches one/some of your interests" |
| All place labels match selected interests  | +2    | "all tags match your interests"      |

Label matching only awards 2 stars when every label on the place is selected in the user's interests.

### Derived Place Categories

Three derived Svelte stores filter and sort the rated place list:

**`placesSurrounding`** — places that are part of the user's broader area context:

- Title appears in `address.split(', ').slice(1).join(', ')` (the address remainder after the first component), OR
- The place's `cls` has `isSurrounding: true` in the class definition

**`placesHere`** — places immediately at the user's position:

- Not in `placesSurrounding`
- `dist < (CLASSES[cls]?.radius || 100)` meters
- `stars > 2`
- Sorted: stars descending, then dist ascending

**`placesNearby`** — other notable places within the search radius:

- Not in `placesSurrounding` and not in `placesHere`
- `stars > 2`
- Sorted: dist ascending

---

## Stage 8 — Background Metadata Loading

**Source:** [src/stores.js](../src/stores.js) `loadMetadata()`

This stage runs in the background after rating, triggered by `pregenerateStoryInBackground()`. It loads images, full article texts, and AI-generated insights.

### Image Loading

Images are loaded in two parallel chains (thumbnail at 100 px, full size at 500 px). Within each chain:

1. **Wikipedia images** — `loadWikipediaImageUrls()` is called first
2. **Wikidata fallback** — `loadWikidataImages()` fills in any places still missing an image

After each chain completes, `places.set(get(places))` triggers a store update to re-render the UI with newly loaded images.

#### Wikipedia Image Strategy

**Primary path:** If a Wikipedia page has a `pageimage` (its designated thumbnail):

- Fetched via `prop=pageimages&pithumbsize={size}`
- Image metadata (license, licenseShortName, artist, descriptionUrl) is fetched separately via `prop=imageinfo&iiprop=url|extmetadata`
- Stored in `place.imageSource`, `place.imageLicense`, `place.imageLicenseUrl`, `place.imageArtist`

**Fallback path:** If no `pageimage` exists:

- All page images are retrieved via `prop=images&imlimit=10`
- The first 5 images are scored after filtering out:
  - Filenames starting with `File:Pictogram`, `File:Icon`, `File:Logo`, `File:Disambig`
  - Extensions: `.svg`, `.djvu`, `.pdf`, `.ogv`, `.webm`
- Scoring per image (via `selectBestImageForPlace()`):

  | Condition                                                     | Score |
  | ------------------------------------------------------------- | ----- |
  | Filename contains place title (case-insensitive)              | +10   |
  | ObjectName/ImageDescription/Categories contain place title    | +8    |
  | Per word of place title (>3 chars) found in combined metadata | +2    |
  | ObjectName contains "interior"                                | −3    |
  | ObjectName contains "detail"                                  | −2    |
  | Combined text contains "map" or "diagram"                     | −5    |

  Images with score ≤ 0 are discarded. The highest-scoring image is selected.

#### Wikidata Image Fallback

**Source:** [src/util/wikidata.js](../src/util/wikidata.js) `loadWikidataImages()`

For places without an image that have a `wikidata` ID:

- Fetches `Special:EntityData/{wikidataId}.json`
- Reads the P18 (image) claim to get a Commons filename
- Resolves the filename to a URL via `getCommonsImageUrl()` against the Wikimedia Commons API
- Stores image URL and metadata (license, artist, source)

### Article Text Loading

Full Wikipedia wikitext is fetched for all `placesHere`, `placesSurrounding`, and `placesNearby` concurrently (three separate `Promise.all()` calls for the three groups). The `revisions` API is used:

```
GET https://{lang}.wikipedia.org/w/api.php
    ?action=query&format=json&pageids={pageid}
    &prop=revisions|pageprops
    &rvprop=content&rvslots=main
    &ppprop=wikibase_item
```

Post-processing removes:

- Wiki tables (`/\{\|[\s\S]*?\|\}/g`)
- Templates (`/\{\{[\s\S]*?\}\}/g`)
- External links (`/\[http[^\]]*\]/g`)
- File/category/namespace links (`/\[\[[^\]]*:[^\]]*\]\]/g`)
- Text beyond 30,000 characters (truncated with `...`)

If the page has a `wikibase_item` property, `place.wikidata` is set from it.

### Insights Extraction

After article texts load, insights are extracted for `placesHere` and `placesSurrounding` that have an `article` (full text). Each place's insights are extracted concurrently.

**Source:** [src/util/ai-facts.js](../src/util/ai-facts.js) `extractInsightsFromArticle()`  
**Model:** simple (default: gpt-5.4-mini)
**Cache:** localStorage key `urban-wanderer-insights-cache`, key = `{first 100 chars of article}|{lang}`, TTL = 7 days

The model is prompted to return a bullet-point list of the most important visit-relevant insights from the article. Output is unstructured text, not JSON. Stored in `place.insights`.

---

## Stage 9 — Story Generation

**Source:** [src/util/ai-story.js](../src/util/ai-story.js) `generateStory()`  
**Model:** advanced (default: gpt-5.4)
**Reasoning effort:** low
**Persistence:** `store: true`, uses `previous_response_id` for continuation

Story generation runs after `loadMetadata()` completes. It uses the OpenAI Responses API with server-side conversation storage.

### System Prompt Context

The system prompt includes:

- **Guide character** from preferences (e.g., "friendly and helpful", "funny and witty")
- **Target language** from preferences
- **Current address** from coordinates
- **Places here** — with title, labels, star rating, and `insights || article || description || snippet || type`
- **Nearby places** — with title, distance, labels, star rating, and `description || snippet || type`
- **Surrounding places** — with title and `insights || article || description || snippet || type`
- **User interest labels** from preferences
- **Paragraph length constraint**: `min(round(0.5 + (placesHere.length + placesSurrounding.length) / 3), 4)` paragraphs

Behavioral constraints in the prompt: no directions, no distances, no welcome/farewell, no generic superlatives, no exact address. Guide character and user familiarity level are applied.

### First vs. Continuation Requests

**First story part** (`storyTexts.length === 0`):

- Single user message: `"Tell me something interesting about this location."`
- Full context in system prompt

**Continuation without `previousResponseId`** (replay mode):

- Prior story texts and user messages reconstructed in the `messages` array
- Final user message: explicitly requests something different, reminds of position and places, limits to 1–3 paragraphs with a bold headline, and enforces factual constraints

**Continuation with `previousResponseId`** (server-chain mode):

- `requestConfig.previous_response_id` is set
- Only the last user message is sent — the API reconstructs prior context from its stored response
- Enables efficient token use for long story sequences

### Preloading

After the first story part is returned, `preloadNextStoryPart()` immediately starts generating the second part. The preloaded result is stored in `preloadedStory`. When the user requests the next part, if preloading has finished, it is served instantly; otherwise a new generation is triggered. A `preloadingStory` guard prevents duplicate concurrent preloads.

---

## On-Demand Content Generation

These functions are called from UI components when the user opens place detail views, not during the main pipeline.

### Fact Extraction

**Source:** [src/util/ai-facts.js](../src/util/ai-facts.js) `extractPlaceFacts()`  
**Model:** advanced (default: gpt-5.4)
**Cache:** localStorage key `urban-wanderer-facts-cache`, key = `{title}|{sorted property names}|{lang}`, TTL = 7 days

Facts are extracted using a dynamic JSON schema derived from the place's class definition in `place-classes.js`. The schema is built from `factsProperties` (a dict of property name → JSON schema fragment).

**Wikidata context enrichment** (`getWikidataContext()`):

1. If `place.wikidata` is set, `fetchWikidataInfo()` is called directly
2. Otherwise `searchWikidataId()` searches Wikidata by `"{place.title} {town}"`, filtering results by description keywords (railway station, church, building, monument, museum, city, town, village)
3. If a Wikidata ID is found, `fetchWikidataInfo()` fetches the entity JSON and extracts 45+ properties (P31, P84, P140, P793, P2048, etc.)
4. Entity IDs in property values are resolved to human-readable labels via batch `wbgetentities` calls (50 IDs per chunk, prefers English labels)
5. Quantitative values include their unit; temporal events include qualifier-derived year ranges

The final AI prompt provides:

- Place title, class, and address context
- Full article text or description
- Wikidata structured data block (if available)

Instructions to the model: extract touristic facts, use null for missing values, avoid redundancy with schema properties in the free-text list, keep descriptions as short phrases (not full sentences), omit location/direction information.

Null normalization post-processing strips various null representations: `null`, `'null'`, `'NULL'`, `'.null'`, `'.NULL'`, `'n/a'`, `'N/A'`, `''`, `'.'`, `'/'`, or whitespace-only strings.

### Article Summary

**Source:** [src/util/ai-facts.js](../src/util/ai-facts.js) `summarizeArticle()`  
**Model:** simple (default: gpt-5.4-mini)
**Cache:** in-memory only (`summaryCache`, keyed by full article text)

Returns a short paragraph summarizing the place. Not persisted to localStorage.

### Historic Event Extraction

**Source:** [src/util/ai-history.js](../src/util/ai-history.js) `extractHistoricEvents()`

Builds a structured event timeline. Selects places with `stars > 2` from here and surrounding; if fewer than 2 such places exist, surrounding places are added. The model returns a JSON array of events with `year` (negative for BC), `date_string` (may be a range), and `text`. Events specific to named places are preferred over generic town/region events.

### Location Comment

**Source:** [src/util/ai-comment.js](../src/util/ai-comment.js) `generateLocationComment()`  
**Model:** advanced (default: gpt-5.4)

Generates a single-sentence characterization of the user's position using the top 5 nearby places and top 3 surrounding places as context.

---

## Map Overlay Generation

Three grid-based environmental maps are generated in parallel, independently of the place pipeline. All use a 40×40 grid with 20 m cell size (covering 800×800 m around the current position). Each is cached with the OSM 15-minute TTL.

### Coordinate Mapping

Geographic coordinates are converted to grid positions via:

1. **`haversineDistance()`** — Earth radius 6,371,000 m, full Haversine formula
2. **`latLonToX/Y()`** — Haversine distance to center along single axis, signed by direction
3. **`coordsToGridX/Y()`** — Divide by cell size (20 m), add grid center offset (20), apply alternating row offset of 0.5 cells for every odd row

### Water Map

**Source:** [src/util/osm.js](../src/util/osm.js) `loadOsmWaterMap()`  
**Search radius:** 500 m (OSM_SEARCH_RADIUS constant)

Fetches waterways via Overpass (river, stream, canal, drain, ditch, weir, dam, waterfall, lock, dock, boatyard, sluice_gate, water_point) for ways, relations, and nodes.

**Rendering:**

Each waterway way is converted to a sequence of grid-space line segments. Width is determined per waterway:

| Type                                                       | Width                          |
| ---------------------------------------------------------- | ------------------------------ |
| River (navigable: `boat=yes`, `motorboat=yes`, `ship=yes`) | 2.4                            |
| River                                                      | 1.8                            |
| Canal (navigable)                                          | 2.0                            |
| Canal                                                      | 1.2                            |
| Weir, dam                                                  | 1.4                            |
| Stream                                                     | 0.8                            |
| Ditch, drain                                               | 0.6                            |
| Explicit `width` tag                                       | `min(max(width/10, 0.3), 3.0)` |
| Default                                                    | 1.0                            |

Segments are drawn as thick lines via **Bresenham's line algorithm** for the center path, then a filled circle of radius `width/2` around each center point. Intensity = `min(1.0, width/1.5)`, faded linearly from center: `fadeIntensity = intensity × (1 − dist/(radius + 0.5))`.

Cell values are accumulated with `increaseWaterLevel()`: adds value, caps at 1.0, recursively propagates to 4 neighbors at value/4 (terminates below 0.1).

### Green Map

**Source:** [src/util/osm.js](../src/util/osm.js) `loadOsmGreenMap()`  
**Search radius:** 500 m

Fetches green land use, leisure, and natural areas (ways and relations), plus individual trees within 400 m (nodes with `natural=tree`).

**Rendering by element type:**

| Type            | Condition                                  | Method                            | Intensity |
| --------------- | ------------------------------------------ | --------------------------------- | --------- |
| Large area      | forest, park, nature_reserve, wood, meadow | Scanline polygon fill             | 0.8       |
| Smaller area    | other landuse/leisure/natural              | Perimeter points with propagation | 0.7       |
| Individual tree | `natural=tree` node                        | Single point                      | 0.6       |

The **scanline polygon fill** algorithm:

1. Projects OSM polygon nodes to grid coordinates; discards out-of-bounds
2. Determines bounding box (minY, maxY)
3. For each scan line y, computes intersections with all edges using the even-odd rule
4. Sorts intersections and fills between paired spans

`increaseGreenLevel()` propagates to 4 neighbors at value/4 only when `value > 0.3` (stronger than water, which propagates unconditionally); terminates below 0.05.

For relations, only `role="outer"` member ways are used to extract nodes.

### Activity Map

**Source:** [src/util/osm.js](../src/util/osm.js) `loadOsmActivityMap()`  
**Search radius:** 600 m (hardcoded for this map)

Fetches shops, food and drink venues, entertainment amenities, and commercial land use.

**Rendering by element type:**

| Type                            | Condition                                          | Intensity       |
| ------------------------------- | -------------------------------------------------- | --------------- |
| Individual node (shop, amenity) | `element.type === 'node'`                          | 0.8             |
| Large area                      | `nodes.length > 10` or `landuse=commercial/retail` | 0.4 (perimeter) |
| Smaller area                    | other ways/relations                               | 0.6 (perimeter) |

`increaseActivityLevel()` propagates to 4 neighbors at value/5 only when `value > 0.3`; terminates below 0.05.

---

## Caching Summary

| Cache             | Storage        | TTL     | Key format                                             | Max entries                                    |
| ----------------- | -------------- | ------- | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------- | --------- |
| OSM places        | localStorage   | 15 min  | `osm_cache_places_{lat3dp}_{lon3dp}_{radius}`          | 50 total OSM entries                           |
| OSM water map     | localStorage   | 15 min  | `osm_cache_watermap_{lat3dp}_{lon3dp}_500`             | (shared 50 limit)                              |
| OSM green map     | localStorage   | 15 min  | `osm_cache_greenmap_{lat3dp}_{lon3dp}_500`             | (shared 50 limit)                              |
| OSM activity map  | localStorage   | 15 min  | `osm_cache_activitymap_{lat3dp}_{lon3dp}_600`          | (shared 50 limit)                              |
| Place analysis    | localStorage   | 7 days  | `place.title` (within `urban-wanderer-analysis-cache`) | unbounded                                      |
| Insights          | localStorage   | 7 days  | `{article[0:100]}                                      | {lang}`(within`urban-wanderer-insights-cache`) | unbounded                                   |
| Facts             | localStorage   | 7 days  | `{title}                                               | {sortedPropertyNames}                          | {lang}`(within`urban-wanderer-facts-cache`) | unbounded |
| Article summaries | in-memory only | session | full article text                                      | unbounded                                      |

OSM caches are evicted when writing if total OSM entries exceed 50 (oldest first). Analysis/insights/facts caches filter expired entries on module load. Summaries are lost on page refresh.

---

## AI Configuration

**Client:** Single shared OpenAI instance (`dangerouslyAllowBrowser: true`), API key loaded from `.openai_api_key.js`.

**Model tiers** (user-configurable, defaults shown):

| Tier     | Default        | Options                                      |
| -------- | -------------- | -------------------------------------------- |
| Simple   | `gpt-5.4-mini` | gpt-5.4-nano, gpt-5.4-mini, gpt-5.4, gpt-5.5 |
| Advanced | `gpt-5.4`      | gpt-5.4-mini, gpt-5.4, gpt-5.5               |

**Reasoning effort:** `'low'` for all calls (constant `AI_REASONING_EFFORT`).

**API used:** OpenAI Responses API (`openai.responses.create()`), not the Chat Completions API.

**Output format by call:**

| Function                     | Format                                         |
| ---------------------------- | ---------------------------------------------- |
| `analyzeSinglePlace`         | `json_object`                                  |
| `translatePlaceName`         | `json_schema` (strict)                         |
| `extractPlaceFacts`          | `json_schema` (dynamic, from class properties) |
| `extractInsightsFromArticle` | free text                                      |
| `summarizeArticle`           | free text                                      |
| `generateStory`              | free text, `store: true`                       |
| History, comment             | free text / JSON array                         |

---

## Place Object Structure

After full pipeline processing, a place object carries:

| Field              | Source                                                 |
| ------------------ | ------------------------------------------------------ |
| `title`            | Wikipedia geosearch / OSM name tag, cleaned            |
| `lang`             | Wikipedia source language                              |
| `pageid`           | Wikipedia page ID                                      |
| `lat`, `lon`       | Coordinates from Wikipedia or OSM                      |
| `dist`             | Distance in meters from user (0 if < 100 m)            |
| `snippet`          | Wikipedia geosearch snippet                            |
| `type`             | OSM tag value (waterway, amenity, tourism, etc.)       |
| `url`              | OSM contact:website or website tag                     |
| `wikipedia`        | OSM wikipedia tag (e.g. `de:Bamberger Dom`)            |
| `wikidata`         | OSM wikidata tag or extracted from Wikipedia pageprops |
| `description`      | Wikipedia intro extract                                |
| `cls`              | AI-assigned class (from CLASSES)                       |
| `labels`           | AI-assigned labels (from LABELS, up to 3)              |
| `importance`       | AI-assigned importance score (1–5)                     |
| `stars`            | Computed rating (0–5)                                  |
| `starDescriptions` | Array of `{number, text}` explaining each star         |
| `imageThumb`       | 100 px image URL (Wikipedia or Wikidata)               |
| `image`            | 500 px image URL (Wikipedia or Wikidata)               |
| `imageSource`      | Image description URL                                  |
| `imageLicense`     | Image license short name                               |
| `imageLicenseUrl`  | Image license URL                                      |
| `imageArtist`      | Image artist/credit                                    |
| `article`          | Full cleaned Wikipedia wikitext (max 30,000 chars)     |
| `insights`         | AI bullet-point insights from article                  |
