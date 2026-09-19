// Configuration for the scripted demo video (see scripts/demo-video/record-demo.mjs).

// Location the demo starts at (Bamberg old town) and the place searched for at the end.
export const START_LOCATION = { latitude: 49.8913, longitude: 10.8864 };
export const SEARCH_QUERY = 'Bamberg Cathedral';

// Preferences seeded into localStorage before the app loads, so the demo is reproducible.
export const DEMO_PREFERENCES = {
	radius: 500,
	labels: ['ARCHITECTURE', 'CULTURE', 'HISTORY', 'RELIGION'],
	guideCharacter: 'friendly and helpful',
	familiarity: 'unfamiliar',
	lang: 'en',
	sourceLanguages: ['en', 'de'],
	audio: false,
	debug: false
};

// Which place the "details" step opens: section 'here' or 'nearby', zero-based index in that list.
export const DETAILS_PLACE = { section: 'nearby', index: 0 };

// Emulated phone. The video is recorded at viewport size times the device scale factor.
export const DEVICE = {
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	userAgent:
		'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
};

// Pauses (ms) used only during the recording pass; the warm-up pass skips them.
export const PACING = {
	short: 800,
	medium: 1800,
	long: 3500,
	read: 6000,
	scrollStep: 160,
	scrollStepDelay: 90,
	typingDelay: 90
};

// Maximum waits (ms) for content that depends on network or AI calls.
export const TIMEOUTS = {
	navigation: 60_000,
	places: 300_000,
	ai: 240_000
};

export const PREVIEW_PORT = 4173;
export const OUTPUT_DIR = 'demo-video';
export const VIDEO_BASENAME = 'urban-wanderer-demo';
