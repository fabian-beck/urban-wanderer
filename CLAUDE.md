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
- **Multi-language Support**: German and English presentation languages (`LANGUAGES`) with AI translation; Wikipedia source languages (`SOURCE_LANGUAGES`: English, German, Czech) are selectable independently
- **Offline-first Architecture**: Multi-level caching (OSM, AI analysis, user preferences)
- **Walk Sessions**: Every location update belongs to a walk that records stops, visited places, and read stories; the guide avoids repetition and marks places already visited
- **Responsive Design**: Works across mobile and desktop

## Core Components

### State Management (`src/stores.js`)

- **coordinates**: User location and address data
- **places**: Nearby places with Wikipedia and OSM data
- **preferences**: User settings (radius, interests, language)
- **walk**: Current walk (stops, visited places, read stories, recap), persisted in localStorage; `recordStop()` runs after rating in `places.update()` and creates a walk if none is active (expiry: last stop older than `WALK_MAX_AGE_MS`). `beginWalk()` is the front-page entry (GPS fix, then continue-or-new choice via `walkResumeCandidate` when the last stop is within `WALK_RESUME_DISTANCE`); `startNewWalk()` replaces the walk from the walk modal
- **story**: `storyTexts`/`storyResponseIds`, `storyLoading` (first part and continuations alike), `preloadedStory`/`preloadingStory`, `storyPartsShown` (parts already displayed in the modal, so autoplay reads each part once); `continueStory()` appends the next part, `resetStory()` clears everything on location change
- **audioState**: `'paused' | 'loading' | 'playing'`, owned by `ai-speech.js` (`speak()`/`stopSpeech()`); `StoryModal` disables speech while a story part is generated and "Tell me more" while audio is loading or playing
- **Derived stores**: Categorized places (here, nearby, surrounding), `walkActive`, `visitedPlaceIdentities` (places that were "here" at an earlier stop)

### Place Classification (`src/constants/place-classes.js`)

Comprehensive classification system with 25+ place types:

- Buildings, landmarks, cultural sites
- Transportation hubs, parks, waterbodies
- Each class has emoji, description, radius, and properties

### Utility Modules (`src/util/`)

**AI Modules:**

- **ai-core.js**: OpenAI client configuration and model tier selection (`getAiModel`); model IDs (`AI_MODELS`), the TTS model (`AI_SPEECH_MODEL`) and per-task reasoning effort (`AI_REASONING_EFFORT`) are defined in `src/constants/ui-config.js`
- **ai-analysis.js**: Place classification, labeling, and importance rating
- **ai-translation.js**: Identity-first and name-similarity deduplication (local), plus batched AI title translation of visible places after rating
- **ai-story.js**: AI-powered location storytelling; paragraph budget from `STORY_LENGTH` in `src/constants/ui-config.js`
- **ai-facts.js**: Structured fact extraction from articles with Wikidata enrichment; `summarizeArticle` returns a two-part place summary (`short`: always shown, `long`: expanded on demand, both empty without meaningful source data), lengths from `SUMMARY_LENGTH` in `src/constants/ui-config.js`
- **ai-history.js**: Historical content generation
- **ai-comment.js**: Place commentary generation
- **ai-speech.js**: Text-to-speech integration; a single utterance at a time, a newer `speak()` or `stopSpeech()` discards any request still loading (story and comment prompts receive the walk context from `walk.js`; `generateWalkRecap` sums up a finished walk)

**Data Integration:**

- **wikipedia.js**: Wikipedia API integration (plain-text articles via TextExtracts, intro extracts, images, metadata)
- **osm.js**: OpenStreetMap integration (POI data, map overlays, 15-min caching)
- **wikidata.js**: Wikidata integration (structured data, image fallback)
- **text.js**: Place mentions in generated texts (`findPlaceMentions`/`markPlacesInText`): first mention of each visible place (here, surrounding, nearby; title and alternate titles, optional leading article, Unicode word boundaries, short inflection suffixes) becomes a markdown link with a `#place:` href; limits in `src/constants/core.js` (`PLACE_MENTION_*`)
- **walk.js**: Pure walk-session helpers (stop merging, visited place snapshots with later enrichment, per-stop comment/events/passed-by places, stats, prompt/recap context)
- **place-identity.js**: Stable place identity (Wikidata ID → Wikipedia page ID → title) shared by walk and history code

### UI Components (`src/components/`)

- **Map.svelte**: Interactive map display
- **PlaceDetailsModal.svelte**: Detailed place information; summarizes the full article (`place.article`, else fetched via `loadWikipediaArticleText`, else the OSM description)
- **StoryModal.svelte**: AI-generated stories about places; a tapped place mention opens `PlacePopup` (thumbnail, rating, short description, "Details" button) instead of the place details so audio playback continues
- **PlaceMentions.svelte**: Renders a markdown text with clickable place mentions (emoji prefix, `onSelect(place, link)` callback), used by story and history
- **PlacePopup.svelte**: Compact place preview positioned below a mention
- **HistoryModal.svelte**: Historical information display (place mentions open the place details directly)
- **WalkModal.svelte**: Walk summary from the header menu (stats, timeline of stops with visited places and read stories, structured AI recap with highlights/connections/timeline/missed places/open threads, start new walk)
- **WalkResumeModal.svelte**: Continue-or-new decision shown after the front-page "Start walk" tap when a recent walk is nearby
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
4. **Deduplication**: Identity-first grouping using Wikidata/Wikipedia references with Levenshtein fallback (no AI)
5. **Content Enrichment**: Wikipedia extracts for all places
6. **AI Analysis**: Classification, labeling, and importance rating
7. **Rating & Translation**: Star-based rating, then batched AI translation of visible place titles only, and filtering into here/nearby/surrounding
8. **Metadata Loading**: Images (Wikipedia → Wikidata fallback), articles, AI insights
9. **Story Generation**: Background pregeneration with Wikidata-enhanced context

## Performance Considerations

**Parallel Processing:**

- All API calls use `Promise.all()` for concurrent execution
- Map overlays load independently in background
- Image loading (thumbnails + full-size) happens asynchronously

**Multi-level Caching:**

- **OSM places & maps**: 15-minute localStorage cache with max 50 entries
- **AI analysis results**: Persistent localStorage with TTL-based cleanup, keyed by stable place identity (Wikidata ID → Wikipedia page ID → title plus rounded coordinates) and `ANALYSIS_CACHE_VERSION`
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

- After bigger changes, check CLAUDE.md if it requires updates.
- when some request required considerable code search, consider updating CLAUDE.md to easier get the right context.
- Record bugs and defects discovered incidentally (outside the scope of the current task) as GitHub issues instead of fixing them inline.
