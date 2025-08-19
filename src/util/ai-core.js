import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../.openai_api_key.js';
import { AI_MODELS } from '../constants.js';

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