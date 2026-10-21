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

The walk of the paper's application example can be recorded as a video with Playwright, together with the stills used as the paper's screenshots:

```bash
npx playwright install chromium   # once
npm run demo:video
```

The script builds the app, serves it with `vite preview`, and emulates a phone (400×900 at a pixel density of 3.5, the paper's screenshot size) whose GPS position moves along the paper's walk through Bamberg with its personalization settings and no motto. A first pass runs the walk without pauses to fill the place analysis and geocoding caches; the second pass records a paced walk with step captions:

1. Preferences.
2. Train station: starting the walk, the comment, the city entry with its facts, the story, and the map toward the old town.
3. Obere Brücke: map and comment, place lists, the Old Town Hall details with "Show more" and facts, the history timeline, and the story with a place preview and "Tell me more".
4. ERBA island: map and comment, and the story.
5. The walk view with its AI recap.

The raw recording lands in `demo-video/` as WebM, scaled down to 800×1800. If `ffmpeg` with libx264 is on the PATH (or set via `FFMPEG_PATH`), an edited MP4 is rendered in which waits for AI content are sped up, marked with a "Fast-forward" badge.

During the recording, lossless stills of the paper's views are saved to `demo-video/stills/` at full pixel density: Fig. 1 under the paper's image names (`app-map.png`, `app-places.png`, `app-place-details.png`, `app-history.png`, `app-story.png`), the cut-outs of the visit figure as `bamberg-visit-1a.png` to `bamberg-visit-3b.png` (full screens in `stills/screens/`), and each fact card of the opened places as `fact-<place>-<key>.png` for the data type table. `steps.json` lists the start and end of each step and wait and the time of each still in the recording and in the edited video.

Options: `--skip-build` reuses the existing build, `--skip-warmup` reuses the cached storage state of a previous run, `--url <base>` drives an already running server, `--headed` shows the browser, `--no-fast-forward` keeps the waits in real time, and `--out <dir>` changes the output directory. Stops, places, seeded preferences, device and video size, pacing, and fast-forward limits are defined in `scripts/demo-video/config.mjs`; the journey steps live in `scripts/demo-video/journey.mjs`.

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
