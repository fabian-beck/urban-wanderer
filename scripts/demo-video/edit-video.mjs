import { spawnSync } from 'node:child_process';

// Returns the ffmpeg command if a build with H.264 support is available (FFMPEG_PATH or PATH)
export function findFfmpeg() {
	const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
	const probe = spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
	if (probe.error || probe.status !== 0 || !probe.stdout.includes('libx264')) {
		return null;
	}
	return ffmpeg;
}

// Splits the recording (times in seconds) into real-time and sped-up segments: each wait plays
// its first `afterMs` in real time and the rest at least `minSpeed` times faster, compressed to at
// most `maxSeconds`. The last segment runs to the end of the recording (end null).
export function planSegments(waits, { afterMs, minSpeed, maxSeconds }) {
	const segments = [];
	let position = 0;
	for (const wait of [...waits].sort((a, b) => a.start - b.start)) {
		const fastStart = Math.max(position, wait.start + afterMs / 1000);
		const fastDuration = wait.end - fastStart;
		if (fastDuration <= 0) {
			continue;
		}
		if (fastStart > position) {
			segments.push({ start: position, end: fastStart, speed: 1 });
		}
		segments.push({
			start: fastStart,
			end: wait.end,
			speed: Math.max(minSpeed, fastDuration / maxSeconds)
		});
		position = wait.end;
	}
	segments.push({ start: position, end: null, speed: 1 });
	return segments;
}

// Maps a time in the recording to the corresponding time in the edited video
export function toEditedTime(segments, time) {
	let edited = 0;
	for (const segment of segments) {
		if (time <= segment.start) {
			break;
		}
		edited += (Math.min(time, segment.end ?? Infinity) - segment.start) / segment.speed;
	}
	return edited;
}

// Renders the segments of the recording into an H.264 MP4; returns whether ffmpeg succeeded
export function renderVideo(ffmpeg, inputPath, outputPath, segments, fps) {
	const count = segments.length;
	const trims = segments.map(({ start, end, speed }, index) => {
		const range = `start=${start.toFixed(3)}${end === null ? '' : `:end=${end.toFixed(3)}`}`;
		return `[s${index}]trim=${range},setpts=(PTS-STARTPTS)/${speed.toFixed(4)}[v${index}]`;
	});
	const filter = [
		`[0:v]split=${count}${segments.map((_, index) => `[s${index}]`).join('')}`,
		...trims,
		`${segments.map((_, index) => `[v${index}]`).join('')}concat=n=${count}:v=1:a=0,fps=${fps},format=yuv420p[out]`
	].join(';');
	const result = spawnSync(
		ffmpeg,
		[
			'-y',
			'-loglevel',
			'error',
			'-i',
			inputPath,
			'-filter_complex',
			filter,
			'-map',
			'[out]',
			'-c:v',
			'libx264',
			'-crf',
			'20',
			'-preset',
			'medium',
			'-movflags',
			'+faststart',
			outputPath
		],
		{ stdio: 'inherit' }
	);
	return result.status === 0;
}
