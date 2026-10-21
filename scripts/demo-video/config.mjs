// Configuration for the scripted demo video (see scripts/demo-video/record-demo.mjs).

// The walk of the paper's application example (Section "Application Example: A Visit of Bamberg"):
// the emulated GPS position at each stop.
export const WALK_STOPS = {
	station: { name: 'Train station', latitude: 49.9005, longitude: 10.8988 },
	bridge: { name: 'Obere Brücke', latitude: 49.8914, longitude: 10.8869 },
	erba: { name: 'ERBA island', latitude: 49.903, longitude: 10.8712 }
};

// Places whose details the journey opens: the city entry at the station and the old town hall at
// Obere Brücke. `exact` matches the whole place title, otherwise a substring of it.
export const CITY_PLACE = { title: 'Bamberg', exact: true };
export const LANDMARK_PLACE = { title: 'Altes Rathaus', exact: false };

// Preferences seeded into localStorage before the app loads: the settings marked in the paper's
// personalization table, no walk motto.
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

// Emulated phone at the size and pixel density of the paper's screenshots. The page renders at
// the full density, so stills are captured at paper resolution; the video is scaled down to
// VIDEO_SIZE.
export const DEVICE = {
	viewport: { width: 400, height: 900 },
	deviceScaleFactor: 3.5,
	isMobile: true,
	hasTouch: true,
	userAgent:
		'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36'
};
export const VIDEO_SIZE = { width: 800, height: 1800 };

// Height-to-width ratios of the story cut-outs in the paper's visit figure (1b and 3b), so new
// stills fit the existing frames
export const STORY_CUTOUT_ASPECT = { station: 1.02, erba: 1.51 };

// Pauses (ms) between and after narration cues; most of the pacing follows the narration
export const PACING = {
	short: 800,
	medium: 1800,
	read: 4000,
	// Silence before each narration cue
	cueGap: 250,
	// Slides fade in and out, and stay a moment after their narration
	slideFade: 500,
	slideHold: 1200,
	// How long the read-aloud story plays in the video
	appAudio: 9000,
	// Scroll animations run at this speed (px/s), but take at least scrollMinMs
	scrollSpeed: 900,
	scrollMinMs: 500
};

// Narration (narration.mjs), spoken with the app's text-to-speech model in another voice than the
// app's guide; clips are cached in NARRATION_DIR
export const NARRATION_VOICE = 'marin';
export const NARRATION_INSTRUCTIONS =
	'You narrate a short demo video of a research prototype. Speak calmly, clearly, and in a friendly tone, at a steady pace.';
export const NARRATION_DIR = 'narration';

// Waits for AI and network content play the first `afterMs` in real time; the rest is sped up by at
// least `minSpeed`, to the end of the running narration cue or else to at most `maxSeconds`, in the
// edited video (requires ffmpeg). A badge marks the sped-up part.
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

// The browser clock starts here (local time), so walk times in the app and its prompts repeat
export const CLOCK_START = '2026-10-21T10:00:00';

// Recorded responses (see replay.mjs) and how similar a request body must be to a recorded one to
// replay its response when they differ (share of common tokens)
export const REPLAY_DIR = 'replay';
export const REPLAY_MIN_SIMILARITY = 0.5;

export const OUTPUT_DIR = 'demo-video';
export const STILLS_DIR = 'stills';
export const VIDEO_BASENAME = 'urban-wanderer-demo';
export const VIDEO_FPS = 25;
