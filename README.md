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

A scripted walk through the app can be recorded as a video with Playwright:

```bash
npx playwright install chromium   # once
npm run demo:video
```

The script builds the app, serves it with `vite preview`, and emulates a phone whose GPS position moves between two stops in Bamberg. A first pass runs the walk without pauses to fill the place analysis and geocoding caches; the second pass records a paced walk with step captions: preferences, starting a walk with a motto, the comment and place lists, place details, a story with a place preview and "Tell me more", the second stop with the earlier stop on the map and visited places, the continued story, and the walk view with its AI recap. The raw recording lands in `demo-video/` as WebM. If `ffmpeg` with libx264 is on the PATH (or set via `FFMPEG_PATH`), an edited MP4 is rendered in which waits for AI content are sped up, marked with a "Fast-forward" badge. `steps.json` lists the start and end of each step and wait in the recording and in the edited video.

Options: `--skip-build` reuses the existing build, `--skip-warmup` reuses the cached storage state of a previous run, `--url <base>` drives an already running server, `--headed` shows the browser, `--no-fast-forward` keeps the waits in real time, and `--out <dir>` changes the output directory. Stops, motto, seeded preferences, device size, pacing, and fast-forward limits are defined in `scripts/demo-video/config.mjs`; the journey steps live in `scripts/demo-video/journey.mjs`.

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
