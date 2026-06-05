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

// OSM search radius for Overpass API queries
export const OSM_SEARCH_RADIUS = 500;
export const OSM_STALE_CACHE_DURATION = 24 * 60 * 60 * 1000;
