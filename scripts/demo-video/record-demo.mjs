// Records a narrated demo video of the walk of the paper's application example, together with the
// stills used as the paper's screenshots.
//
//   npm run demo:video                   build, preview, record (replaying recorded data), edit
//   npm run demo:video -- --record       discard the recorded data and record it anew
//   npm run demo:video -- --skip-build   reuse the existing build/ directory
//   npm run demo:video -- --url http://localhost:5173   drive an already running server
//   npm run demo:video -- --headed       watch the recording in a visible browser
//   npm run demo:video -- --no-fast-forward   keep AI waits in real time in the edited video
//   npm run demo:video -- --out <dir>    output directory (default demo-video/)
//
// The narration cues (narration.mjs) are synthesized with OpenAI text-to-speech before recording
// (tts.mjs, cached in narration/), and their durations pace the journey. All external responses
// (Wikipedia, Wikidata, OpenStreetMap, OpenAI, images) are recorded to replay/ on the first run and
// replayed afterwards (replay.mjs), so every recording shows the same places, ratings, and
// generated texts; the browser clock starts at CLOCK_START, so times shown and sent in prompts
// repeat as well. With ffmpeg, the raw WebM is edited into an MP4 that starts at the title slide,
// speeds up waits for AI content, and carries the narration mixed with the app's read-aloud story
// and the narration as subtitles (also written as .srt). The page renders at the paper's pixel
// density while the video is scaled down; the recording saves lossless stills of the paper's views
// to stills/ (cut-outs also as full screens in stills/screens/), and steps.json lists the times of
// steps, cues, waits, and stills in both videos.
//
// Environment: DEMO_BROWSER_PATH overrides the Chromium binary, FFMPEG_PATH points to an ffmpeg
// binary with libx264 when it is not on PATH.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { AI_SPEECH_MODEL } from '../../src/constants/ui-config.js';
import {
	CLOCK_START,
	DEMO_PREFERENCES,
	DEVICE,
	FAST_FORWARD,
	NARRATION_DIR,
	NARRATION_INSTRUCTIONS,
	NARRATION_VOICE,
	OUTPUT_DIR,
	REPLAY_DIR,
	REPLAY_MIN_SIMILARITY,
	STILLS_DIR,
	TIMEOUTS,
	VIDEO_BASENAME,
	VIDEO_FPS,
	VIDEO_SIZE
} from './config.mjs';
import {
	buildSubtitles,
	findFfmpeg,
	planSegments,
	renderVideo,
	toEditedTime
} from './edit-video.mjs';
import { runJourney } from './journey.mjs';
import { NARRATION } from './narration.mjs';
import { installOverlay } from './overlay.mjs';
import { attachReplay } from './replay.mjs';
import { synthesizeNarration, writeNarrationTrack } from './tts.mjs';

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
const outputPath = (extension) => path.join(outputDir, `${VIDEO_BASENAME}${extension}`);

mkdirSync(outputDir, { recursive: true });

const ffmpeg = findFfmpeg();
const fastForward = Boolean(ffmpeg) && !flag('--no-fast-forward');
if (!ffmpeg) {
	console.log('ffmpeg with libx264 not found: recording WebM only, without fast-forwarded waits');
}

let previewServer;
let baseUrl = option('--url');

try {
	console.log('\nSynthesizing narration');
	const { clips: narration, requested } = await synthesizeNarration(NARRATION, {
		dir: path.join(outputDir, NARRATION_DIR),
		model: AI_SPEECH_MODEL,
		voice: NARRATION_VOICE,
		instructions: NARRATION_INSTRUCTIONS
	});
	const speech = Object.values(narration).reduce((sum, clip) => sum + clip.duration, 0);
	console.log(
		`  ${Object.keys(narration).length} cues (${requested} synthesized), ${speech.toFixed(0)} s of speech`
	);

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
		args: [
			// Without this flag the screencast is captured at CSS pixel size instead of being scaled
			// down from device pixels to the video size.
			`--force-device-scale-factor=${DEVICE.deviceScaleFactor}`,
			// The read-aloud story starts after its speech has loaded, when the tap no longer counts
			'--autoplay-policy=no-user-gesture-required'
		]
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
		let lastSpeech = null;
		const replay = await attachReplay(context, {
			dir: replayDir,
			record,
			isLocal: (url) => url.startsWith(origin),
			fetchInNode: (url) => new URL(url).host === 'api.openai.com',
			minSimilarity: REPLAY_MIN_SIMILARITY,
			onResponse: ({ url, body }) => {
				if (url.includes('/audio/speech')) {
					lastSpeech = body;
				}
			}
		});
		await context.clock.install({ time: new Date(CLOCK_START) });
		await context.addInitScript((prefs) => {
			localStorage.setItem('preferences', JSON.stringify(prefs));
		}, DEMO_PREFERENCES);
		await context.addInitScript(installOverlay);
		rmSync(stillsDir, { recursive: true, force: true });
		mkdirSync(path.join(stillsDir, 'screens'), { recursive: true });
		const page = await context.newPage();
		// Stills come from plain CDP screenshots: Playwright's screenshots re-render the page (at
		// another scale for clips), which shows up as glitches in the video. Clips are cut out on a
		// page of a separate, unrecorded context.
		const cdp = await context.newCDPSession(page);
		const cropPage = await (await browser.newContext()).newPage();
		const recordingStart = Date.now();
		const seconds = (time) => (time - recordingStart) / 1000;
		let videoStart = 0;
		const steps = [];
		const cues = [];
		const waits = [];
		const stills = [];
		const appAudio = [];
		let recordingEnd;
		try {
			await runJourney(page, baseUrl, {
				narration,
				fastForward,
				onVideoStart: () => {
					videoStart = seconds(Date.now());
				},
				onStep: ({ name, startedAt, endedAt }) =>
					steps.push({ name, start: seconds(startedAt), end: seconds(endedAt) }),
				onCue: ({ key, startedAt }) => cues.push({ key, time: seconds(startedAt) }),
				onWait: ({ startedAt, endedAt, targetSeconds }) =>
					waits.push({ start: seconds(startedAt), end: seconds(endedAt), targetSeconds }),
				onStill: async ({ name, clip }) => {
					const time = seconds(Date.now());
					const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
					const screen = Buffer.from(data, 'base64');
					if (clip) {
						writeFileSync(path.join(stillsDir, 'screens', `${name}.png`), screen);
						const cut = await cropPng(cropPage, screen, clip, DEVICE.deviceScaleFactor);
						writeFileSync(path.join(stillsDir, `${name}.png`), cut);
					} else {
						writeFileSync(path.join(stillsDir, `${name}.png`), screen);
					}
					stills.push({ name, time, clip });
				},
				onAppAudio: ({ startedAt, endedAt }) => {
					const file = path.join(outputDir, `app-audio-${appAudio.length + 1}.mp3`);
					writeFileSync(file, lastSpeech);
					appAudio.push({ file, start: seconds(startedAt), end: seconds(endedAt) });
				}
			});
		} finally {
			recordingEnd = seconds(Date.now());
			const video = page.video();
			await replay.save();
			await context.close();
			const { replayed, similar, recorded } = replay.stats;
			console.log(
				`\nData: ${replayed} responses replayed, ${similar} by similar request, ${recorded} recorded`
			);
			const webmPath = outputPath('.webm');
			renameSync(await video.path(), webmPath);
			console.log(`Recording: ${path.relative(rootDir, webmPath)}`);

			const segments = fastForward
				? planSegments(waits, FAST_FORWARD, videoStart)
				: [{ start: videoStart, end: null, speed: 1 }];
			const edited = (time) => toEditedTime(segments, time);
			const placedCues = cues.map(({ key, time }) => ({
				key,
				file: narration[key].file,
				text: NARRATION[key],
				start: edited(time),
				duration: narration[key].duration
			}));
			const narrationPath = outputPath('-narration.wav');
			writeNarrationTrack(
				narrationPath,
				placedCues.map(({ file, start }) => ({ file, time: start })),
				edited(recordingEnd)
			);
			const subtitlesPath = outputPath('.srt');
			writeFileSync(subtitlesPath, buildSubtitles(placedCues));
			if (ffmpeg) {
				const mp4Path = outputPath('.mp4');
				const rendered = renderVideo(ffmpeg, {
					input: webmPath,
					output: mp4Path,
					segments,
					fps: VIDEO_FPS,
					narration: narrationPath,
					appAudio: appAudio.map(({ file, start, end }) => ({
						file,
						time: edited(start),
						duration: end - start
					})),
					subtitles: subtitlesPath
				});
				console.log(
					rendered
						? `Edited video: ${path.relative(rootDir, mp4Path)}`
						: 'ffmpeg failed; the WebM recording is still available'
				);
			}
			writeTimeline({ steps, cues, waits, stills }, edited);
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

// Writes steps.json with the times of each step, narration cue, wait, and still in the recording
// and in the edited video; still clips are in CSS pixels of the viewport
function writeTimeline({ steps, cues, waits, stills }, edited) {
	const round = (time) => Math.round(time * 100) / 100;
	const withVideoTimes = (entry) => ({
		...entry,
		start: round(entry.start),
		end: round(entry.end),
		videoStart: round(edited(entry.start)),
		videoEnd: round(edited(entry.end))
	});
	const withVideoTime = (entry) => ({
		...entry,
		time: round(entry.time),
		videoTime: round(edited(entry.time))
	});
	writeFileSync(
		path.join(outputDir, 'steps.json'),
		JSON.stringify(
			{
				steps: steps.map(withVideoTimes),
				cues: cues.map(withVideoTime),
				waits: waits.map(withVideoTimes),
				stills: stills.map((still) => ({
					...withVideoTime(still),
					file: path.posix.join(STILLS_DIR, `${still.name}.png`)
				}))
			},
			null,
			'\t'
		)
	);
}

// Cuts the clip (CSS pixels) out of a PNG screenshot taken at the given device scale factor
async function cropPng(page, png, clip, scale) {
	const data = await page.evaluate(
		async ([base64, clip, scale]) => {
			const image = new Image();
			image.src = `data:image/png;base64,${base64}`;
			await image.decode();
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(clip.width * scale);
			canvas.height = Math.round(clip.height * scale);
			canvas
				.getContext('2d')
				.drawImage(
					image,
					Math.round(clip.x * scale),
					Math.round(clip.y * scale),
					canvas.width,
					canvas.height,
					0,
					0,
					canvas.width,
					canvas.height
				);
			return canvas.toDataURL('image/png').split(',')[1];
		},
		[png.toString('base64'), clip, scale]
	);
	return Buffer.from(data, 'base64');
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
