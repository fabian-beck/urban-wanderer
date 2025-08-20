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
- **OpenStreetMap Integration**: Additional place data and mapping
- **Multi-language Support**: German and English interfaces
- **Offline-first Architecture**: Local storage for user preferences
- **Responsive Design**: Works across mobile and desktop

## Core Components

### State Management (`src/stores.js`)

- **coordinates**: User location and address data
- **places**: Nearby places with Wikipedia and OSM data
- **preferences**: User settings (radius, interests, language)
- **Derived stores**: Categorized places (here, nearby, surrounding)

### Place Classification (`src/constants.js`)

Comprehensive classification system with 25+ place types:

- Buildings, landmarks, cultural sites
- Transportation hubs, parks, waterbodies
- Each class has emoji, description, radius, and properties

### Utility Modules (`src/util/`)

- **ai.js**: OpenAI integration for place analysis and content generation
- **geo.js**: Wikipedia and OSM API integration, location utilities
- **text.js**: Text processing utilities

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

### OpenStreetMap (Nominatim)

- Reverse geocoding for addresses
- Additional place data and metadata
- Overpass API for detailed place information

### OpenAI Integration

- GPT-powered place analysis and storytelling
- Content generation based on user preferences
- Intelligent place categorization and rating

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
├── routes/             # SvelteKit page routes
├── util/               # Utility modules (AI, geo, text)
├── app.html           # HTML template
├── app.css            # Global styles
├── stores.js          # Svelte stores for state management
└── constants.js       # Application constants and configurations

android/               # Android native project
build/                # Production build output
static/               # Static assets
```

## Performance Considerations

- Efficient place loading with parallel API calls
- Image lazy loading and thumbnail optimization
- Local caching of user preferences
- Progressive place analysis with loading states
- Optimized bundle size with Vite

## Security & Privacy

- Location data processed locally
- No persistent server-side storage
- OpenAI API calls for content generation only
- User preferences stored in local storage

This application demonstrates modern web-to-mobile development patterns, AI integration, and location-based service architecture.

- avoid redundant comments that stated obvious things or unnecessary historical context.
- Don't start the development server (it is usually already running), use npm run build to test if everything compiles
- Contants should be defined in @src\constants.js

- use linter (npm run lint) after substantial code edits
