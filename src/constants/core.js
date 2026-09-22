export const appName = 'Urban Wanderer';

export const nArticles = 40;

// Wikipedia article processing
export const MAX_ARTICLE_LENGTH = 30000;

// Grid constants
export const GRID_CELL_SIZE = 20; // Grid cell size in both pixels and meters
export const GRID_ARRAY_SIZE = 40; // Grid array dimensions

// Stipple size factors (0-1, where 1.0 fills the grid cell)
export const GREEN_STIPPLE_SIZE = 0.8;
export const WATER_STIPPLE_SIZE = 1.0;
export const ACTIVITY_STIPPLE_SIZE = 0.6;

// Place highlighting constants
export const PLACE_MIN_DISTANCE = 70;
export const PLACE_VISIBLE_MIN_STARS = 2;
export const PLACE_HIGH_RATED_MIN_STARS = 3;
export const PLACE_TWO_STAR_HIGH_RATED_LIMIT = 5;
export const PLACE_HERE_DEFAULT_RADIUS = 150;
export const PLACE_PARTIAL_INTEREST_MATCH_STARS = 1;
export const PLACE_FULL_INTEREST_MATCH_STARS = 2;
export const SURROUNDING_ADDRESS_PART_KEYS = [
	'road',
	'suburb',
	'town',
	'village',
	'county',
	'state',
	'country'
];
export const METADATA_PRIORITY_NEARBY_LIMIT = 12;
export const METADATA_BACKGROUND_DELAY_MS = 750;
export const HISTORY_MIN_CONTEXT_PLACES = 2;
export const HISTORY_NEARBY_FALLBACK_LIMIT = 8;
export const HISTORY_MAX_CONTEXT_PLACES = 14;
export const HISTORY_LOCAL_ADDRESS_PART_KEYS = ['road', 'suburb', 'village'];
export const HISTORY_BROAD_ADDRESS_PART_KEYS = ['town', 'county', 'state', 'country'];

// Place mentions in generated texts (stories, historic events): a place name must be
// at least this long to be marked, each word of the name may carry a short inflection
// suffix (e.g. "Alten Hofhaltung" for "Alte Hofhaltung"), longer words may also change
// their last letter (e.g. "Österreichische" for "Österreichisches"), and a leading
// article is optional.
export const PLACE_MENTION_MIN_LENGTH = 4;
export const PLACE_MENTION_MAX_SUFFIX_LETTERS = 2;
export const PLACE_MENTION_INFLECTED_WORD_MIN_LENGTH = 6;
export const PLACE_MENTION_LEADING_ARTICLES = ['the', 'der', 'die', 'das', 'le', 'la', 'les', 'el'];
export const PLACE_MENTION_HREF_PREFIX = '#place:';
export const PLACE_POPUP_TEXT_LENGTH = 220;

// OSM search radius for Overpass API queries
export const OSM_SEARCH_RADIUS = 500;
export const OSM_ACTIVITY_RADIUS = 600;
export const OSM_TREE_RADIUS = 400;
export const OSM_STALE_CACHE_DURATION = 24 * 60 * 60 * 1000;
export const OSM_WATERWAY_TYPES =
	'river|stream|canal|drain|ditch|weir|dam|waterfall|lock|dock|boatyard|sluice_gate|water_point';
export const MAP_LOCATION_EXCLUDED_PLACE_CLASSES = ['WATERBODY'];
export const MAP_LOCATION_EXCLUDED_PLACE_TYPES = ['river', 'stream', 'canal', 'drain', 'ditch'];
export const OSM_GREEN_LANDUSE_TYPES =
	'forest|meadow|orchard|vineyard|grass|recreation_ground|village_green';
export const OSM_GREEN_LEISURE_TYPES =
	'park|nature_reserve|garden|common|recreation_ground|pitch|playground';
export const OSM_GREEN_NATURAL_TYPES =
	'wood|scrub|grassland|heath|moor|wetland|marsh|fell|bare_rock|scree|shingle|sand|beach|coastline|tree_row';
export const OSM_ACTIVITY_SHOP_TYPES =
	'mall|supermarket|department_store|bakery|butcher|clothes|convenience|general|gift|jewelry|shoes|sports|toys|electronics|furniture|florist|bookshop|chemist|optician|hairdresser|beauty|bicycle|car|mobile_phone';
export const OSM_ACTIVITY_FOOD_AMENITY_TYPES =
	'restaurant|fast_food|cafe|pub|bar|biergarten|food_court|ice_cream';
export const OSM_ACTIVITY_ENTERTAINMENT_AMENITY_TYPES =
	'nightclub|casino|cinema|theatre|arts_centre|community_centre';

// Walk session
export const WALK_STOP_MERGE_DISTANCE = 30;
export const WALK_RESUME_DISTANCE = 10000;
export const WALK_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;
export const WALK_VISITED_CONTEXT_LIMIT = 20;
export const WALK_STORY_CONTEXT_LIMIT = 12;
export const WALK_STORY_CONTEXT_MAX_CHARS = 40000;
export const WALK_STORY_EXCERPT_LENGTH = 300;
export const WALK_RECAP_STORY_EXCERPT_LENGTH = 600;
export const WALK_SNAPSHOT_TEXT_LENGTH = 700;
export const WALK_PASSED_PLACES_PER_STOP = 6;
export const WALK_EVENTS_PER_STOP = 8;
export const WALK_RECAP_MISSED_PLACES_LIMIT = 12;
export const WALK_MOTTO_MAX_LENGTH = 300;
// Live position polling while the map is shown (independent of recorded stops)
export const LIVE_POSITION_INTERVAL_MS = 60 * 1000;
