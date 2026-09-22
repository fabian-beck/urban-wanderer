import { openai } from './ai-core.js';
import { audioState } from '../stores.js';
import { createLogger } from './logger.js';
import { AI_SPEECH_MODEL, AI_SPEECH_SPEED, AI_SPEECH_VOICE } from '../constants/ui-config.js';

const logger = createLogger('ai.speech');

// Only one utterance exists at a time; a new request or a stop invalidates every older one
let audio = null;
let requestId = 0;

function releaseAudio() {
	if (!audio) {
		return;
	}
	audio.onended = null;
	audio.onerror = null;
	audio.pause();
	URL.revokeObjectURL(audio.src);
	audio = null;
}

// Stops loading or playback and returns the audio state to 'paused'
export function stopSpeech() {
	requestId += 1;
	releaseAudio();
	audioState.set('paused');
}

// Reads the text aloud, replacing any speech that is still loading or playing;
// the audio state moves through 'loading' and 'playing' back to 'paused'
export async function speak(text, preferences) {
	stopSpeech();
	const id = requestId;
	audioState.set('loading');
	logger.info('Generating speech', { characters: text.length });
	logger.debug('Speech input', { text });
	const instructions = `
You are ${preferences.guideCharacter} city guide and speak accordingly.
`;
	try {
		const response = await openai.audio.speech.create({
			model: AI_SPEECH_MODEL,
			voice: AI_SPEECH_VOICE,
			instructions,
			speed: AI_SPEECH_SPEED,
			input: text
		});
		const blob = await response.blob();
		if (id !== requestId) {
			return;
		}
		audio = new Audio(URL.createObjectURL(blob));
		audio.onended = () => {
			if (id === requestId) {
				stopSpeech();
			}
		};
		audio.onerror = () => {
			if (id === requestId) {
				logger.error('Audio playback failed', audio?.error);
				stopSpeech();
			}
		};
		await audio.play();
		if (id === requestId) {
			audioState.set('playing');
		}
	} catch (error) {
		if (id !== requestId) {
			return;
		}
		stopSpeech();
		logger.error('Speech failed', error);
		throw error;
	}
}
