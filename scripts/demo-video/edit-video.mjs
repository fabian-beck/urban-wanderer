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

// The sped-up part of a wait (times in seconds): it starts `afterMs` after the wait and runs at
// least `minSpeed` times faster, compressed to the wait's `targetSeconds` (the rest of the
// narration running when the wait started, minus the real-time part) or else to `maxSeconds`.
// Returns null for waits too short to be sped up.
export function fastForwardOf(wait, { afterMs, minSpeed, maxSeconds }) {
	const start = wait.start + afterMs / 1000;
	const duration = wait.end - start;
	if (duration <= 0) {
		return null;
	}
	const target =
		wait.targetSeconds > afterMs / 1000 ? wait.targetSeconds - afterMs / 1000 : maxSeconds;
	return { start, end: wait.end, speed: Math.max(minSpeed, duration / target) };
}

// Seconds a wait loses in the edited video
export function savedSeconds(wait, options) {
	const fast = fastForwardOf(wait, options);
	return fast ? (fast.end - fast.start) * (1 - 1 / fast.speed) : 0;
}

// Splits the recording from `from` on into real-time and sped-up segments (see fastForwardOf). The
// last segment runs to the end of the recording (end null).
export function planSegments(waits, options, from = 0) {
	const segments = [];
	let position = from;
	for (const wait of [...waits].sort((a, b) => a.start - b.start)) {
		const fast = fastForwardOf(wait, options);
		if (!fast || fast.start < position) {
			continue;
		}
		if (fast.start > position) {
			segments.push({ start: position, end: fast.start, speed: 1 });
		}
		segments.push(fast);
		position = fast.end;
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

// SubRip subtitles from narration cues ({ text, start, duration } in seconds of the edited video):
// one subtitle per sentence, timed in proportion to its length within the cue
export function buildSubtitles(cues) {
	const timestamp = (seconds) => {
		const ms = Math.round(seconds * 1000);
		const pad = (value, length = 2) => String(value).padStart(length, '0');
		return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
	};
	const entries = [];
	for (const { text, start, duration } of cues) {
		const sentences = text.match(/[^.!?]+[.!?]+["”']?\s*/g) || [text];
		let offset = 0;
		for (const sentence of sentences) {
			const length = (sentence.length / text.length) * duration;
			entries.push({ start: start + offset, end: start + offset + length, text: sentence.trim() });
			offset += length;
		}
	}
	return entries
		.map(
			(entry, index) =>
				`${index + 1}\n${timestamp(entry.start)} --> ${timestamp(entry.end)}\n${entry.text}\n`
		)
		.join('\n');
}

// Renders the segments of the recording into an H.264 MP4 with an AAC audio track mixed from the
// narration track (WAV, already in edited-video time) and app audio clips ({ file, time, duration }
// in edited-video time), plus the subtitles as a soft subtitle track; returns whether ffmpeg
// succeeded
export function renderVideo(
	ffmpeg,
	{ input, output, segments, fps, narration = null, appAudio = [], subtitles = null }
) {
	const count = segments.length;
	const trims = segments.map(({ start, end, speed }, index) => {
		const range = `start=${start.toFixed(3)}${end === null ? '' : `:end=${end.toFixed(3)}`}`;
		return `[s${index}]trim=${range},setpts=(PTS-STARTPTS)/${speed.toFixed(4)}[v${index}]`;
	});
	const filters = [
		`[0:v]split=${count}${segments.map((_, index) => `[s${index}]`).join('')}`,
		...trims,
		`${segments.map((_, index) => `[v${index}]`).join('')}concat=n=${count}:v=1:a=0,fps=${fps},format=yuv420p[out]`
	];
	const inputs = ['-i', input];
	const audioLabels = [];
	if (narration) {
		inputs.push('-i', narration);
		filters.push(`[1:a]aresample=48000[narration]`);
		audioLabels.push('[narration]');
	}
	for (const clip of appAudio) {
		const index = inputs.length / 2;
		inputs.push('-i', clip.file);
		const delay = Math.round(clip.time * 1000);
		filters.push(
			`[${index}:a]atrim=0:${clip.duration.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,adelay=${delay}:all=1[app${index}]`
		);
		audioLabels.push(`[app${index}]`);
	}
	const maps = ['-map', '[out]'];
	if (audioLabels.length) {
		filters.push(
			`${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0:dropout_transition=0[audio]`
		);
		maps.push('-map', '[audio]', '-c:a', 'aac', '-b:a', '160k');
	}
	if (subtitles) {
		const index = inputs.length / 2;
		inputs.push('-i', subtitles);
		maps.push('-map', `${index}:s`, '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng');
	}
	const result = spawnSync(
		ffmpeg,
		[
			'-y',
			'-loglevel',
			'error',
			...inputs,
			'-filter_complex',
			filters.join(';'),
			...maps,
			'-c:v',
			'libx264',
			'-crf',
			'20',
			'-preset',
			'medium',
			'-movflags',
			'+faststart',
			output
		],
		{ stdio: 'inherit' }
	);
	return result.status === 0;
}
