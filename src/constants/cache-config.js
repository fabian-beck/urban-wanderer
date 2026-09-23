// Cache configuration constants
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cache keys for different data types
export const INSIGHTS_CACHE_KEY = 'urban-wanderer-insights-cache';
export const FACTS_CACHE_KEY = 'urban-wanderer-facts-cache';
// Bump when the facts prompt or schema changes so stale entries are ignored
export const FACTS_CACHE_VERSION = 2;
export const ANALYSIS_CACHE_KEY = 'urban-wanderer-analysis-cache';
// Bump when the analysis prompt or model changes so stale entries are ignored
export const ANALYSIS_CACHE_VERSION = 2;
// Coordinate precision (decimal places, ~1 km) used to disambiguate places keyed by title
export const ANALYSIS_CACHE_COORDINATE_PRECISION = 2;
export const REVERSE_GEOCODE_CACHE_KEY = 'urban-wanderer-reverse-geocode-cache';
export const REVERSE_GEOCODE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
export const REVERSE_GEOCODE_CACHE_PRECISION = 4;
export const WALK_STORAGE_KEY = 'urban-wanderer-walk';
