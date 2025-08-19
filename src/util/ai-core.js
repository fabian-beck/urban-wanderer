import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../.openai_api_key.js';
import { preferences } from '../stores.js';
import { get } from 'svelte/store';
import { AI_MODELS } from '../constants.js';

// Shared OpenAI instance
export const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

// Helper function to get AI model with fallback
export function getAiModel(type) {
	const prefs = get(preferences);
	if (type === 'simple') {
		return prefs?.aiModelSimple || AI_MODELS.DEFAULT_SIMPLE;
	} else if (type === 'advanced') {
		return prefs?.aiModelAdvanced || AI_MODELS.DEFAULT_ADVANCED;
	}
	return AI_MODELS.DEFAULT_SIMPLE;
}