// Records a demo video of a scripted walk through the app.
//
//   npm run demo:video                   build, preview, warm up caches, record, edit
//   npm run demo:video -- --skip-build   reuse the existing build/ directory
//   npm run demo:video -- --skip-warmup  reuse the cached storage state of a previous run
//   npm run demo:video -- --url http://localhost:5173   drive an already running server
//   npm run demo:video -- --headed       watch the recording pass in a visible browser
//   npm run demo:video -- --no-fast-forward   keep AI waits in real time in the edited video
//   npm run demo:video -- --out <dir>    output directory (default demo-video/)
//
// The warm-up pass runs the walk without pauses so that place analysis, facts, summaries and
// reverse geocoding are cached in localStorage; the recording pass reuses that storage state
// without the walk, so it starts a fresh walk and only waits for uncached AI content (comments,
// stories, recap). With ffmpeg, the raw WebM is edited into an MP4 in which these waits are sped up.
//
// Environment: DEMO_BROWSER_PATH overrides the Chromium binary, FFMPEG_PATH points to an ffmpeg
// binary with libx264 when it is not on PATH.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { WALK_STORAGE_KEY } from '../../src/constants/cache-config.js';
import {
	DEMO_PREFERENCES,
	DEVICE,
	FAST_FORWARD,
	OUTPUT_DIR,
	PREVIEW_PORT,
	TIMEOUTS,
	VIDEO_BASENAME,
	VIDEO_FPS
} from './config.mjs';
import { findFfmpeg, planSegments, renderVideo, toEditedTime } from './edit-video.mjs';
import { runJourney } from './journey.mjs';
import { installOverlay } from './overlay.mjs';

// Left out of the cached storage state, so each recording starts a new walk with the configured
// preferences
const RESET_STORAGE_KEYS = ['preferences', WALK_STORAGE_KEY];

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const outputDir = path.resolve(rootDir, option('--out') || OUTPUT_DIR);
const storageStatePath = path.join(outputDir, 'storage-state.json');
const videoSize = {
	width: DEVICE.viewport.width * DEVICE.deviceScaleFactor,
	height: DEVICE.viewport.height * DEVICE.deviceScaleFactor
};
const contextOptions = { ...DEVICE, permissions: ['geolocation'] };

mkdirSync(outputDir, { recursive: true });

const ffmpeg = findFfmpeg();
const fastForward = Boolean(ffmpeg) && !flag('--no-fast-forward');
if (!ffmpeg) {
	console.log('ffmpeg with libx264 not found: recording WebM only, without fast-forwarded waits');
}

let previewServer;
let baseUrl = option('--url');

try {
	if (!baseUrl) {
		if (!flag('--skip-build')) {
			run('npm', ['run', 'build']);
		}
		previewServer = await startPreviewServer();
		baseUrl = `http://127.0.0.1:${PREVIEW_PORT}/`;
	}

	const browser = await chromium.launch({
		headless: !flag('--headed'),
		executablePath: process.env.DEMO_BROWSER_PATH || undefined,
		// Without this flag the screencast is captured at CSS pixel size and padded to the video size.
		args: [`--force-device-scale-factor=${DEVICE.deviceScaleFactor}`]
	});

	try {
		if (!flag('--skip-warmup') || !existsSync(storageStatePath)) {
			console.log('\nWarm-up pass (filling caches)');
			const context = await browser.newContext(contextOptions);
			await seedPreferences(context);
			const page = await context.newPage();
			await runJourney(page, baseUrl, { recording: false });
			saveStorageState(await context.storageState());
			await context.close();
		} else {
			console.log(`\nSkipping warm-up, reusing ${path.relative(rootDir, storageStatePath)}`);
		}

		console.log('\nRecording pass');
		const context = await browser.newContext({
			...contextOptions,
			storageState: storageStatePath,
			recordVideo: { dir: outputDir, size: videoSize }
		});
		await seedPreferences(context);
		await context.addInitScript(installOverlay);
		const page = await context.newPage();
		const recordingStart = Date.now();
		const seconds = (time) => (time - recordingStart) / 1000;
		const steps = [];
		const waits = [];
		try {
			await runJourney(page, baseUrl, {
				recording: true,
				fastForward,
				onStep: ({ name, caption, startedAt, endedAt }) =>
					steps.push({ name, caption, start: seconds(startedAt), end: seconds(endedAt) }),
				onWait: ({ startedAt, endedAt }) =>
					waits.push({ start: seconds(startedAt), end: seconds(endedAt) })
			});
		} finally {
			const video = page.video();
			await context.close();
			const webmPath = path.join(outputDir, `${VIDEO_BASENAME}.webm`);
			renameSync(await video.path(), webmPath);
			console.log(`\nRecording: ${path.relative(rootDir, webmPath)}`);
			const segments = fastForward
				? planSegments(waits, FAST_FORWARD)
				: [{ start: 0, end: null, speed: 1 }];
			if (ffmpeg) {
				const mp4Path = path.join(outputDir, `${VIDEO_BASENAME}.mp4`);
				if (renderVideo(ffmpeg, webmPath, mp4Path, segments, VIDEO_FPS)) {
					console.log(`Edited video: ${path.relative(rootDir, mp4Path)}`);
				} else {
					console.log('ffmpeg failed; the WebM recording is still available');
				}
			}
			writeTimeline(steps, waits, ffmpeg ? segments : null);
		}
	} finally {
		await browser.close();
	}
} catch (error) {
	console.error(`\nDemo recording failed: ${error.message.split('\n')[0]}`);
	process.exitCode = 1;
} finally {
	if (previewServer) {
		stopServer(previewServer);
	}
}

async function seedPreferences(context) {
	await context.addInitScript((prefs) => {
		if (!localStorage.getItem('preferences')) {
			localStorage.setItem('preferences', JSON.stringify(prefs));
		}
	}, DEMO_PREFERENCES);
}

function saveStorageState(state) {
	for (const origin of state.origins) {
		origin.localStorage = origin.localStorage.filter(
			({ name }) => !RESET_STORAGE_KEYS.includes(name)
		);
	}
	writeFileSync(storageStatePath, JSON.stringify(state));
}

// Writes steps.json with the start and end of each step and wait in the recording and, if an
// edited video was rendered, in that video
function writeTimeline(steps, waits, segments) {
	const round = (time) => Math.round(time * 100) / 100;
	const withVideoTimes = (entry) => ({
		...entry,
		start: round(entry.start),
		end: round(entry.end),
		...(segments && {
			videoStart: round(toEditedTime(segments, entry.start)),
			videoEnd: round(toEditedTime(segments, entry.end))
		})
	});
	writeFileSync(
		path.join(outputDir, 'steps.json'),
		JSON.stringify(
			{ steps: steps.map(withVideoTimes), waits: waits.map(withVideoTimes) },
			null,
			'\t'
		)
	);
}

async function startPreviewServer() {
	console.log(`\nStarting preview server on port ${PREVIEW_PORT}`);
	const server = spawn(
		'npx',
		['vite', 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'],
		{ cwd: rootDir, stdio: 'ignore', shell: process.platform === 'win32' }
	);
	const url = `http://127.0.0.1:${PREVIEW_PORT}/`;
	const deadline = Date.now() + TIMEOUTS.navigation;
	while (Date.now() < deadline) {
		if (server.exitCode !== null) {
			throw new Error('Preview server exited before it became reachable');
		}
		try {
			const response = await fetch(url);
			if (response.ok) {
				return server;
			}
		} catch {
			// not up yet
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	stopServer(server);
	throw new Error(`Preview server did not respond at ${url}`);
}

// On Windows the server runs below a shell, which kill() would end without ending vite
function stopServer(server) {
	if (process.platform === 'win32') {
		spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
	} else {
		server.kill();
	}
}

function run(command, args) {
	console.log(`\n> ${command} ${args.join(' ')}`);
	const result = spawnSync(command, args, {
		cwd: rootDir,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
	}
}
