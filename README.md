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
