// Configuration for the scripted demo video (see scripts/demo-video/record-demo.mjs).

// The walk through Bamberg's old town: the emulated GPS position at each stop. Stops stay within
// the map extent of each other, so the second stop shows the first one as a walk marker.
export const WALK_STOPS = [
	{ name: 'Obere Brücke', latitude: 49.8914, longitude: 10.8869 },
	{ name: 'Domplatz', latitude: 49.8909, longitude: 10.883 }
];
export const WALK_MOTTO = 'Tell me about the people behind the places.';

// Preferences seeded into localStorage before the app loads (the application example settings of
// the paper), so the demo is reproducible.
export const DEMO_PREFERENCES = {
	radius: 500,
	labels: [
		'ACTIVITIES',
		'ARCHITECTURE',
		'EDUCATION',
		'GEOGRAPHY',
		'HISTORY',
		'NATURE',
		'TRANSPORTATION'
	],
	guideCharacter: 'friendly and helpful',
	familiarity: 'unfamiliar',
	lang: 'en',
	sourceLanguages: ['de', 'en'],
	audio: false,
	debug: false
};

// The place the details step opens at the first stop: the first list entry containing `title`,
// searched in `section` ('here' or 'nearby') first, else the first place of that section (or of
// the other one if it is empty).
export const DETAILS_PLACE = { title: 'Altes Rathaus', section: 'here' };

// Emulated phone. The video is recorded at viewport size times the device scale factor.
export const DEVICE = {
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	userAgent:
		'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36'
};

// Pauses (ms) used only during the recording pass; the warm-up pass skips them.
export const PACING = {
	short: 800,
	medium: 1800,
	long: 3500,
	read: 6000,
	caption: 3500,
	scrollStep: 160,
	scrollStepDelay: 90,
	typingDelay: 60
};

// Step captions shown at the top of the screen during the recording.
export const SHOW_CAPTIONS = true;

// Waits for AI and network content play the first `afterMs` in real time; the rest is sped up by at
// least `minSpeed` and to at most `maxSeconds` in the edited video (requires ffmpeg). A badge marks
// the sped-up part.
export const FAST_FORWARD = {
	afterMs: 1500,
	minSpeed: 4,
	maxSeconds: 3
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
export const VIDEO_FPS = 25;
