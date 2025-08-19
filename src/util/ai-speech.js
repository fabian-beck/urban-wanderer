import { openai } from './ai-core.js';

let audio = null;

export async function textToSpeech(text, audioState, preferences) {
	if (audioState.get() === 'playing') {
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
	if (audioState.get() === 'paused') {
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
		audioState.set('paused');
		audio = null;
	};
}
