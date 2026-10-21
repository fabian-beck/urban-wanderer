import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../src/.openai_api_key.js';

// Raw PCM as returned by the speech API: 24 kHz, mono, signed 16-bit little-endian
export const PCM_SAMPLE_RATE = 24000;
const PCM_BYTES_PER_SECOND = PCM_SAMPLE_RATE * 2;

// Synthesizes each narration cue with OpenAI text-to-speech. Clips are cached as PCM files named
// after a hash of text and voice settings, so only new or changed cues are requested. Returns
// { [key]: { file, duration } } with durations in seconds.
export async function synthesizeNarration(cues, { dir, model, voice, instructions }) {
	mkdirSync(dir, { recursive: true });
	const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
	const clips = {};
	let requested = 0;
	await Promise.all(
		Object.entries(cues).map(async ([key, text]) => {
			const id = createHash('sha1')
				.update(JSON.stringify([model, voice, instructions, text]))
				.digest('hex')
				.slice(0, 16);
			const file = path.join(dir, `${key}-${id}.pcm`);
			if (!existsSync(file)) {
				const response = await openai.audio.speech.create({
					model,
					voice,
					instructions,
					input: text,
					response_format: 'pcm'
				});
				writeFileSync(file, Buffer.from(await response.arrayBuffer()));
				requested += 1;
			}
			clips[key] = { file, duration: statSync(file).size / PCM_BYTES_PER_SECOND };
		})
	);
	return { clips, requested };
}

// Places the clips at their times (seconds) in one silent track of the given duration and writes it
// as a WAV file
export function writeNarrationTrack(outputPath, placements, duration) {
	const samples = Buffer.alloc(Math.ceil(duration * PCM_SAMPLE_RATE) * 2);
	for (const { file, time } of placements) {
		const clip = readFileSync(file);
		const offset = Math.round(time * PCM_SAMPLE_RATE) * 2;
		clip.copy(samples, offset, 0, Math.max(0, Math.min(clip.length, samples.length - offset)));
	}
	const header = Buffer.alloc(44);
	header.write('RIFF', 0);
	header.writeUInt32LE(36 + samples.length, 4);
	header.write('WAVE', 8);
	header.write('fmt ', 12);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20);
	header.writeUInt16LE(1, 22);
	header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
	header.writeUInt32LE(PCM_BYTES_PER_SECOND, 28);
	header.writeUInt16LE(2, 32);
	header.writeUInt16LE(16, 34);
	header.write('data', 36);
	header.writeUInt32LE(samples.length, 40);
	writeFileSync(outputPath, Buffer.concat([header, samples]));
}
