// Records a demo video of the walk of the paper's application example, together with the stills
// used as the paper's screenshots.
//
//   npm run demo:video                   build, preview, record (replaying recorded data), edit
//   npm run demo:video -- --record       discard the recorded data and record it anew
//   npm run demo:video -- --skip-build   reuse the existing build/ directory
//   npm run demo:video -- --url http://localhost:5173   drive an already running server
//   npm run demo:video -- --headed       watch the recording in a visible browser
//   npm run demo:video -- --no-fast-forward   keep AI waits in real time in the edited video
//   npm run demo:video -- --out <dir>    output directory (default demo-video/)
//
// All external responses (Wikipedia, Wikidata, OpenStreetMap, OpenAI, images) are recorded to
// replay/ on the first run and replayed afterwards (replay.mjs), so every recording shows the same
// places, ratings, and generated texts; the browser clock starts at CLOCK_START, so times shown and
// sent in prompts repeat as well. With ffmpeg, the raw WebM is edited into an MP4 in which waits for
// AI content are sped up. The page renders at the paper's pixel density while the video is scaled
// down; the recording saves lossless stills of the paper's views to stills/ (cut-outs also as full
// screens in stills/screens/), and steps.json lists their times in both videos.
//
// Environment: DEMO_BROWSER_PATH overrides the Chromium binary, FFMPEG_PATH points to an ffmpeg
// binary with libx264 when it is not on PATH.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
	CLOCK_START,
	DEMO_PREFERENCES,
	DEVICE,
	FAST_FORWARD,
	OUTPUT_DIR,
	REPLAY_DIR,
	REPLAY_MIN_SIMILARITY,
	STILLS_DIR,
	TIMEOUTS,
	VIDEO_BASENAME,
	VIDEO_FPS,
	VIDEO_SIZE
} from './config.mjs';
import { findFfmpeg, planSegments, renderVideo, toEditedTime } from './edit-video.mjs';
import { runJourney } from './journey.mjs';
import { installOverlay } from './overlay.mjs';
import { attachReplay } from './replay.mjs';

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const outputDir = path.resolve(rootDir, option('--out') || OUTPUT_DIR);
const stillsDir = path.join(outputDir, STILLS_DIR);
const replayDir = path.join(outputDir, REPLAY_DIR);

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
		const port = await findFreePort();
		previewServer = await startPreviewServer(port);
		baseUrl = `http://127.0.0.1:${port}/`;
	}

	const browser = await chromium.launch({
		headless: !flag('--headed'),
		executablePath: process.env.DEMO_BROWSER_PATH || undefined,
		// Without this flag the screencast is captured at CSS pixel size instead of being scaled down
		// from device pixels to the video size.
		args: [`--force-device-scale-factor=${DEVICE.deviceScaleFactor}`]
	});

	try {
		const record = flag('--record') || !existsSync(path.join(replayDir, 'index.json'));
		console.log(record ? '\nRecording data and video' : '\nRecording video, replaying data');
		const context = await browser.newContext({
			...DEVICE,
			permissions: ['geolocation'],
			recordVideo: { dir: outputDir, size: VIDEO_SIZE }
		});
		const { origin } = new URL(baseUrl);
		const replay = await attachReplay(context, {
			dir: replayDir,
			record,
			isLocal: (url) => url.startsWith(origin),
			minSimilarity: REPLAY_MIN_SIMILARITY
		});
		await context.clock.install({ time: new Date(CLOCK_START) });
		await context.addInitScript((prefs) => {
			localStorage.setItem('preferences', JSON.stringify(prefs));
		}, DEMO_PREFERENCES);
		await context.addInitScript(installOverlay);
		rmSync(stillsDir, { recursive: true, force: true });
		mkdirSync(path.join(stillsDir, 'screens'), { recursive: true });
		const page = await context.newPage();
		const recordingStart = Date.now();
		const seconds = (time) => (time - recordingStart) / 1000;
		const steps = [];
		const waits = [];
		const stills = [];
		try {
			await runJourney(page, baseUrl, {
				recording: true,
				fastForward,
				onStep: ({ name, caption, startedAt, endedAt }) =>
					steps.push({ name, caption, start: seconds(startedAt), end: seconds(endedAt) }),
				onWait: ({ startedAt, endedAt }) =>
					waits.push({ start: seconds(startedAt), end: seconds(endedAt) }),
				onStill: async ({ name, clip }) => {
					const time = seconds(Date.now());
					await page.screenshot({ path: path.join(stillsDir, `${name}.png`), clip });
					if (clip) {
						await page.screenshot({ path: path.join(stillsDir, 'screens', `${name}.png`) });
					}
					stills.push({ name, time, clip });
				}
			});
		} finally {
			const video = page.video();
			await replay.save();
			await context.close();
			const { replayed, similar, recorded } = replay.stats;
			console.log(
				`\nData: ${replayed} responses replayed, ${similar} by similar request, ${recorded} recorded`
			);
			const webmPath = path.join(outputDir, `${VIDEO_BASENAME}.webm`);
			renameSync(await video.path(), webmPath);
			console.log(`Recording: ${path.relative(rootDir, webmPath)}`);
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
			writeTimeline(steps, waits, stills, ffmpeg ? segments : null);
			console.log(`Stills: ${stills.length} in ${path.relative(rootDir, stillsDir)}`);
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

// Writes steps.json with the times of each step, wait, and still in the recording and, if an
// edited video was rendered, in that video; still clips are in CSS pixels of the viewport
function writeTimeline(steps, waits, stills, segments) {
	const round = (time) => Math.round(time * 100) / 100;
	const videoTime = (time) => (segments ? round(toEditedTime(segments, time)) : round(time));
	const withVideoTimes = (entry) => ({
		...entry,
		start: round(entry.start),
		end: round(entry.end),
		videoStart: videoTime(entry.start),
		videoEnd: videoTime(entry.end)
	});
	const withVideoTime = (entry) => ({
		...entry,
		file: path.posix.join(STILLS_DIR, `${entry.name}.png`),
		time: round(entry.time),
		videoTime: videoTime(entry.time)
	});
	writeFileSync(
		path.join(outputDir, 'steps.json'),
		JSON.stringify(
			{
				steps: steps.map(withVideoTimes),
				waits: waits.map(withVideoTimes),
				stills: stills.map(withVideoTime)
			},
			null,
			'\t'
		)
	);
}

function findFreePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address();
			server.close(() => resolve(port));
		});
	});
}

async function startPreviewServer(port) {
	console.log(`\nStarting preview server on port ${port}`);
	const server = spawn(
		'npx',
		['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
		{ cwd: rootDir, stdio: 'ignore', shell: process.platform === 'win32' }
	);
	const url = `http://127.0.0.1:${port}/`;
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
