import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../.openai_api_key.js';
import { AI_MODELS, LANGUAGES } from '../constants/ui-config.js';

// Shared OpenAI instance
export const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

// Helper function to get AI model with fallback
export function getAiModel(type, preferences = {}) {
	if (type === 'simple') {
		return preferences?.aiModelSimple || AI_MODELS.DEFAULT_SIMPLE;
	} else if (type === 'advanced') {
		return preferences?.aiModelAdvanced || AI_MODELS.DEFAULT_ADVANCED;
	}
	return AI_MODELS.DEFAULT_SIMPLE;
}

export function getLanguageName(lang) {
	return LANGUAGES.find((l) => l.value === lang)?.name || lang;
}

// Output language rule for prompts whose sources may be in another language
// (Wikipedia editions, Wikidata labels, OSM tags).
export function buildOutputLanguageInstruction(lang) {
	const name = getLanguageName(lang);
	return `Output language: ${name} ('${lang}'). Write every text value in ${name}, including labels, short phrases, and single words, even when the sources are written in another language. Translate terms from the sources into ${name}; keep only proper names (people, places, organizations) in their original form.`;
}
