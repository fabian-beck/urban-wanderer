# Urban Wanderer

Urban Wanderer is a geo-based app that provides relevant information for your current location.

# Run Locally in Browser

## Install Depdencies

```bash
npm install
```

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

After building, sync the code to the capicitor app.

```bash

npx cap sync
```

Use Android Studio to run or build the app (`android` directory).
