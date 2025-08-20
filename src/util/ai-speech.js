import { openai } from './ai-core.js';
import { get } from 'svelte/store';

let audio = null;

export async function textToSpeech(text, audioState, preferences) {
	// Defensive check to ensure audioState is a store
	if (!audioState || typeof audioState.set !== 'function' || typeof audioState.subscribe !== 'function') {
		console.error('audioState must be a Svelte store with set() and subscribe() methods');
		return;
	}

	if (get(audioState) === 'playing') {
		audioState.set('paused');
		if (audio) {
			audio.pause();
		}
	}
	audioState.set('loading');
	console.log('Text to speech:', text);
	const instructions = `
You are ${preferences.guideCharacter} city guide and speak accordingly.
`;
	const response = await openai.audio.speech.create({
		model: 'gpt-4o-mini-tts',
		voice: 'alloy',
		instructions,
		speed: 1.2,
		input: text
	});
	const blob = await response.blob();
	if (audio) {
		audio.pause();
	}
	audio = new Audio(URL.createObjectURL(blob));
	if (get(audioState) === 'paused') {
		return;
	}
	document.querySelectorAll('audio').forEach((audio) => audio.pause());
	audioState.set('playing');
	audio.play();
	const unsubscribe = audioState.subscribe((state) => {
		if (state === 'paused') {
			audio.pause();
			unsubscribe();
		}
	});
	audio.onended = () => {
		if (audioState && typeof audioState.set === 'function') {
			audioState.set('paused');
		}
		audio = null;
	};
}
