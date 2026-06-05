# Urban Wanderer

## Project Overview

Urban Wanderer is a geo-location based mobile application that provides intelligent, AI-powered information about places near the user's location. Built with SvelteKit and packaged as a native Android app using Capacitor, it combines location services, Wikipedia data, and AI analysis to create personalized location-based experiences.

## Architecture

### Frontend Framework

- **SvelteKit**: Modern web framework for the main application
- **Capacitor**: Cross-platform native runtime for mobile deployment
- **Tailwind CSS + Flowbite**: UI styling and components
- **Vite**: Build tool and development server

### Key Features

- **Real-time Location Services**: Uses Capacitor Geolocation API
- **AI-Powered Place Analysis**: Integrates OpenAI API for intelligent content generation
- **Wikipedia Integration**: Fetches articles and metadata for nearby places
- **OpenStreetMap Integration**: POI data, map overlays, and caching
- **Wikidata Integration**: Structured data enrichment and image fallback
- **Multi-language Support**: German and English interfaces with AI translation
- **Offline-first Architecture**: Multi-level caching (OSM, AI analysis, user preferences)
- **Responsive Design**: Works across mobile and desktop

## Core Components

### State Management (`src/stores.js`)

- **coordinates**: User location and address data
- **places**: Nearby places with Wikipedia and OSM data
- **preferences**: User settings (radius, interests, language)
- **Derived stores**: Categorized places (here, nearby, surrounding)

### Place Classification (`src/constants/place-classes.js`)

Comprehensive classification system with 25+ place types:

- Buildings, landmarks, cultural sites
- Transportation hubs, parks, waterbodies
- Each class has emoji, description, radius, and properties

### Utility Modules (`src/util/`)

**AI Modules:**

- **ai-core.js**: OpenAI client configuration
- **ai-analysis.js**: Place classification, labeling, and importance rating
- **ai-translation.js**: Multi-language place name translation and deduplication
- **ai-story.js**: AI-powered location storytelling
- **ai-facts.js**: Structured fact extraction from articles with Wikidata enrichment
- **ai-history.js**: Historical content generation
- **ai-comment.js**: Place commentary generation
- **ai-speech.js**: Text-to-speech integration

**Data Integration:**

- **wikipedia.js**: Wikipedia API integration (articles, extracts, images, metadata)
- **osm.js**: OpenStreetMap integration (POI data, map overlays, 15-min caching)
- **wikidata.js**: Wikidata integration (structured data, image fallback)
- **text.js**: Text processing utilities

**Logging:**

- Use `createLogger(scope)` from `src/util/logger.js` instead of direct `console.*` calls.
- Keep main lifecycle events, counts, warnings, and failures at `info`/`warn`/`error`.
- Put raw API payloads, prompts, full responses, and matching traces behind `debug`; the existing debug preference enables debug-level logs.

### UI Components (`src/components/`)

- **Map.svelte**: Interactive map display
- **PlaceDetailsModal.svelte**: Detailed place information
- **StoryModal.svelte**: AI-generated stories about places
- **HistoryModal.svelte**: Historical information display
- **UserPreferences.svelte**: Settings and customization

## Development Commands

```bash
# Development
npm run dev           # Start development server
npm run dev -- --open # Start server and open browser

# Production
npm run build         # Build for production
npm run preview       # Preview production build

# Code Quality
npm run lint          # Run ESLint
npm run format        # Format code with Prettier

# Mobile Development
npx cap sync          # Sync web code to native projects
# Use Android Studio to build/run the Android app
```

## Mobile Deployment

The app is configured for Android deployment through Capacitor:

- **App ID**: com.fbeck.urbanwanderer
- **Build Directory**: `build/`
- **Android Project**: `android/` directory
- Native features: Geolocation, device orientation

## Data Sources

### Wikipedia API

- Nearby articles based on coordinates
- Article extracts and full content
- Image URLs and metadata
- Multi-language support

### OpenStreetMap (Nominatim & Overpass)

- Reverse geocoding for addresses
- POI data (amenities, tourism, historic, man-made, leisure)
- Map overlays (water, green spaces, commercial activity)
- Overpass API for detailed place information
- 15-minute localStorage caching with automatic cleanup

### Wikidata

- Structured entity data (45+ properties: architecture, events, physical characteristics)
- Image fallback for places without Wikipedia images
- Enhanced context for AI fact extraction
- Entity label resolution for human-readable data

### OpenAI Integration

- GPT-powered place analysis and storytelling
- Intelligent place classification (25+ categories)
- Multi-language translation and deduplication
- Content generation based on user preferences
- Structured fact extraction from articles

## User Personalization

### Preferences System

- **Interests**: Architecture, Culture, Geography, History, Religion, Sports, Transportation
- **Search Radius**: Configurable distance for place discovery
- **Guide Character**: Different AI personality styles
- **Familiarity Level**: Adjusts content complexity
- **Language Settings**: Interface and content language

### Place Rating System

Star-based rating combining:

- Wikipedia article availability (+1 star)
- Place importance (+1-2 stars)
- User interest matching (+1-2 stars)

## File Structure

```
src/
├── components/          # Svelte UI components
├── constants/          # Application constants and configurations
├── routes/             # SvelteKit page routes
├── util/               # Utility modules (AI, geo, text)
├── app.html           # HTML template
├── app.css            # Global styles
└── stores.js          # Svelte stores for state management

android/               # Android native project
build/                # Production build output
static/               # Static assets
```

## Data Processing Pipeline

The application processes location data through 9 distinct stages:

1. **Location Acquisition**: GPS, random location, or search-based coordinates
2. **Parallel Data Fetching**: Concurrent Wikipedia, OSM, and map overlay requests
3. **Data Merging**: Combines Wikipedia and OSM data by matching place titles
4. **Deduplication & Translation**: AI-powered grouping using Levenshtein distance
5. **Content Enrichment**: Wikipedia extracts for all places
6. **AI Analysis**: Classification, labeling, and importance rating
7. **Rating & Categorization**: Star-based rating and filtering into here/nearby/surrounding
8. **Metadata Loading**: Images (Wikipedia → Wikidata fallback), articles, AI insights
9. **Story Generation**: Background pregeneration with Wikidata-enhanced context

## Performance Considerations

**Parallel Processing:**

- All API calls use `Promise.all()` for concurrent execution
- Map overlays load independently in background
- Image loading (thumbnails + full-size) happens asynchronously

**Multi-level Caching:**

- **OSM places & maps**: 15-minute localStorage cache with max 50 entries
- **AI analysis results**: Persistent localStorage with TTL-based cleanup
- **AI facts & insights**: Content-based cache keys for cross-session reuse
- **User preferences**: Persistent localStorage

**Progressive Loading:**

- Core place data loads first
- Images load progressively (Wikipedia first, Wikidata fallback)
- Articles and insights load in background
- Story segments pregenerated for instant continuation

**Smart Image Selection:**

- Relevance scoring algorithm for Wikipedia images
- Metadata extraction (license, artist, source)
- Thumbnail optimization (100px) and full-size (500px) variants

## Security & Privacy

- Location data processed locally
- No persistent server-side storage
- OpenAI API calls for content generation only
- User preferences stored in local storage

This application demonstrates modern web-to-mobile development patterns, AI integration, and location-based service architecture.

- avoid redundant comments that stated obvious things or unnecessary historical context.
- Don't start the development server (it is usually already running), use npm run build to test if everything compiles
- Constants should be defined in src/constants/

- use linter (npm run lint) after substantial code edits

- Avoid comments that comment on removed parts or old versions

- Don't create new cache keys to invalidate existing localStorage data unless explicitly requested.
- When a change affects cached behavior, tell the user when to manually empty the relevant cache before testing.

- After bigger changes, check AGENTS.md if it requires updates.
- when some request required considerable code search, consider updating AGENTS.md to easier get the right context.
