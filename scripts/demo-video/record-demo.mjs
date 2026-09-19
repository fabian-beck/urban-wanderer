// Records a demo video of a scripted user journey through the app.
//
//   npm run demo:video                 build, preview, warm up caches, record
//   npm run demo:video -- --skip-build reuse the existing build/ directory
//   npm run demo:video -- --skip-warmup
//   npm run demo:video -- --url http://localhost:5173   drive an already running server
//   npm run demo:video -- --headed     watch the recording pass in a visible browser
//
// The warm-up pass runs the same journey without pauses so that AI analysis, facts and
// reverse-geocoding results are cached in localStorage; the recording pass then reuses that
// storage state and only waits for uncached content (stories and comments).
//
// Environment: DEMO_BROWSER_PATH overrides the Chromium binary, FFMPEG_PATH points to an ffmpeg
// binary when it is not on PATH (used to convert the WebM recording to MP4).

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
	DEMO_PREFERENCES,
	DEVICE,
	OUTPUT_DIR,
	PREVIEW_PORT,
	TIMEOUTS,
	VIDEO_BASENAME
} from './config.mjs';
import { runJourney } from './journey.mjs';

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

mkdirSync(outputDir, { recursive: true });

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
			const context = await browser.newContext({ ...DEVICE });
			await seedPreferences(context);
			const page = await context.newPage();
			await runJourney(page, baseUrl, { recording: false });
			await context.storageState({ path: storageStatePath });
			await context.close();
		} else {
			console.log(`\nSkipping warm-up, reusing ${path.relative(rootDir, storageStatePath)}`);
		}

		console.log('\nRecording pass');
		const context = await browser.newContext({
			...DEVICE,
			storageState: storageStatePath,
			recordVideo: { dir: outputDir, size: videoSize }
		});
		await seedPreferences(context);
		await context.addInitScript(showTapRipples);
		const page = await context.newPage();
		const recordingStart = Date.now();
		const steps = [];
		try {
			await runJourney(page, baseUrl, {
				recording: true,
				onStep: (step) =>
					steps.push({
						name: step.name,
						startSeconds: (step.startedAt - recordingStart) / 1000,
						endSeconds: (step.endedAt - recordingStart) / 1000
					})
			});
		} finally {
			const video = page.video();
			await context.close();
			const webmPath = path.join(outputDir, `${VIDEO_BASENAME}.webm`);
			renameSync(await video.path(), webmPath);
			writeFileSync(path.join(outputDir, 'steps.json'), JSON.stringify(steps, null, '\t'));
			console.log(`\nVideo: ${path.relative(rootDir, webmPath)}`);
			convertToMp4(webmPath);
		}
	} finally {
		await browser.close();
	}
} catch (error) {
	console.error(`\nDemo recording failed: ${error.message.split('\n')[0]}`);
	process.exitCode = 1;
} finally {
	previewServer?.kill();
}

async function seedPreferences(context) {
	await context.addInitScript((prefs) => {
		if (!localStorage.getItem('preferences')) {
			localStorage.setItem('preferences', JSON.stringify(prefs));
		}
	}, DEMO_PREFERENCES);
}

// Draws a short-lived ring where the user taps, so interactions are visible in the video.
function showTapRipples() {
	const style = document.createElement('style');
	style.textContent = `
		.demo-tap {
			position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px;
			border-radius: 50%; border: 3px solid rgba(37, 99, 235, 0.9);
			background: rgba(37, 99, 235, 0.25); pointer-events: none; z-index: 2147483647;
			animation: demo-tap 450ms ease-out forwards;
		}
		@keyframes demo-tap {
			from { transform: scale(0.4); opacity: 1; }
			to { transform: scale(1.4); opacity: 0; }
		}`;
	document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
	document.addEventListener(
		'pointerdown',
		(event) => {
			const ripple = document.createElement('div');
			ripple.className = 'demo-tap';
			ripple.style.left = `${event.clientX}px`;
			ripple.style.top = `${event.clientY}px`;
			document.body.appendChild(ripple);
			setTimeout(() => ripple.remove(), 500);
		},
		true
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
	server.kill();
	throw new Error(`Preview server did not respond at ${url}`);
}

function convertToMp4(webmPath) {
	const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
	const probe = spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' });
	if (probe.error || probe.status !== 0) {
		console.log('ffmpeg not found; skipping MP4 conversion (set FFMPEG_PATH or install ffmpeg)');
		return;
	}
	const mp4Path = webmPath.replace(/\.webm$/, '.mp4');
	const result = spawnSync(
		ffmpeg,
		[
			'-y',
			'-loglevel',
			'error',
			'-i',
			webmPath,
			'-c:v',
			'libx264',
			'-crf',
			'20',
			'-pix_fmt',
			'yuv420p',
			'-movflags',
			'+faststart',
			mp4Path
		],
		{ stdio: 'inherit' }
	);
	if (result.status === 0) {
		console.log(`MP4:   ${path.relative(rootDir, mp4Path)}`);
	} else {
		console.log('ffmpeg conversion failed; the WebM recording is still available');
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
