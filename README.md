# Urban Wanderer

Urban Wanderer is a geo-based app that provides relevant information for your current location.

# Run Locally in Browser

## Install Depdencies

```bash
npm install
```

## Configure OpenAI API Key

The app requires an OpenAI API key for AI-powered features. Create a file at `src/.openai_api_key.js` with the following content:

```javascript
export const OPENAI_API_KEY = 'your-openai-api-key-here';
```

Replace `'your-openai-api-key-here'` with your actual OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys).

**Note:** This file is gitignored to keep your API key secure.

## Developing

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Recording a Demo Video

The walk of the paper's application example can be recorded as a narrated video with Playwright, together with the stills used as the paper's screenshots:

```bash
npx playwright install chromium   # once
npm run demo:video
```

The script builds the app, serves it with `vite preview`, and emulates a phone (400×900 at a pixel density of 3.5, the paper's screenshot size) whose GPS position moves along the paper's walk through Bamberg with its personalization settings and no motto. Title and section slides structure the video:

1. Personalization settings.
2. Arrival at the train station: starting the walk, the comment, the city entry with its facts, the story, and the map toward the old town.
3. Visiting the historic old town (Obere Brücke): map and comment, place lists, the Old Town Hall details with "Show more" and facts, the history timeline, the story read aloud by the app, a place preview, "Tell me more", and the nearby places.
4. Strolling through park and suburban area (ERBA island): map and comment, and the story.
5. Looking back on the walk: the walk view with its AI recap.

A voice-over explains each step. Its text lives in `scripts/demo-video/narration.mjs` and is synthesized with the app's OpenAI text-to-speech model (`marin` voice) before recording; clips are cached in `demo-video/narration/`, so only new or changed cues are requested. The narration drives the pacing: each cue starts together with the interaction it describes, the next interaction waits until it has ended, and a wait for AI content during a cue is sped up to end with it.

The first run records all responses from Wikipedia, Wikidata, OpenStreetMap, and OpenAI (and the images) to `demo-video/replay/`; later runs replay them with their original latency, and the browser clock always starts at the same time, so every recording shows the same places, ratings, texts, and times. Changed requests, such as prompts with other times, fall back to the most similar recorded request. Delete the folder or pass `--record` to record new data.

The raw recording lands in `demo-video/` as WebM, scaled down to 800×1800. If `ffmpeg` with libx264 is on the PATH (or set via `FFMPEG_PATH`), the edited `urban-wanderer-demo.mp4` is rendered: it starts at the title slide, speeds up waits for AI content (marked with a "Fast-forward" badge), and carries the narration mixed with the app's read-aloud story plus the narration as a subtitle track. The narration track and subtitles are also written as `urban-wanderer-demo-narration.wav` and `urban-wanderer-demo.srt`.

During the recording, lossless stills of the paper's views are saved to `demo-video/stills/` at full pixel density: Fig. 1 under the paper's image names (`app-map.png`, `app-places.png`, `app-place-details.png`, `app-history.png`, `app-story.png`), the cut-outs of the visit figure as `bamberg-visit-1a.png` to `bamberg-visit-3b.png` (full screens in `stills/screens/`), and each fact card of the opened places as `fact-<place>-<key>.png` for the data type table. `steps.json` lists the times of each step, narration cue, wait, and still in the recording and in the edited video.

Options: `--record` records new data, `--skip-build` reuses the existing build, `--url <base>` drives an already running server, `--headed` shows the browser, `--no-fast-forward` keeps the waits in real time, and `--out <dir>` changes the output directory. Stops, places, seeded preferences, device and video size, narration voice, pacing, and fast-forward limits are defined in `scripts/demo-video/config.mjs`; the journey steps live in `scripts/demo-video/journey.mjs`.

# Run as Android App (supported by Capacitor)

## Build a Debug APK

Make sure Android Studio is installed and the Android SDK path in `android/local.properties` points to an SDK location owned by your Windows user, for example:

```properties
sdk.dir=C\:\\Users\\your-user\\AppData\\Local\\Android\\Sdk
```

Then build the APK with one command:

```bash
npm run build:apk
```

This command builds the Svelte app, syncs the web output into Capacitor, and runs Gradle's `assembleDebug` task. On Windows, the script automatically uses Android Studio's bundled JDK from `C:\Program Files\Android\Android Studio\jbr` when `JAVA_HOME` is not set.

The generated debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To build an unsigned release APK instead, run:

```bash
npm run build:apk -- --release
```

You can still open the `android` directory in Android Studio to run the app on an emulator or device.
