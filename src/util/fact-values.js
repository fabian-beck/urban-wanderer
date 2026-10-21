import { FACT_NULL_PHRASES, FACT_PLACEHOLDER_REPEATED_DIGITS_MIN } from '../constants/core.js';
import { MEASUREMENT_PROPERTIES, PROPERTIES, YEAR_PROPERTIES } from '../constants/place-classes.js';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest phrases first so that "keine angabe" is removed before "keine"
const NULL_PHRASES_PATTERN = new RegExp(
	`(?<![\\p{L}\\p{N}])(?:${[...FACT_NULL_PHRASES]
		.sort((a, b) => b.length - a.length)
		.map((phrase) => escapeRegExp(phrase).replace(/\\\.\s+/g, '\\.\\s*'))
		.join('|')})(?![\\p{L}\\p{N}])`,
	'giu'
);
const REPEATED_DIGITS_PATTERN = new RegExp(
	`^(\\d)\\1{${FACT_PLACEHOLDER_REPEATED_DIGITS_MIN - 1},}$`
);

function isPlaceholderText(text) {
	return text.replace(NULL_PHRASES_PATTERN, '').replace(/[\p{P}\s]/gu, '') === '';
}

function normalizeText(value) {
	const text = value.trim();
	return isPlaceholderText(text) ? null : text;
}

function normalizeNumber(key, value) {
	if (!Number.isFinite(value)) return null;
	if (YEAR_PROPERTIES.includes(key)) return value === 0 ? null : value;
	if (value <= 0 || REPEATED_DIGITS_PATTERN.test(String(value))) return null;
	return value;
}

function normalizeMeasurement(text) {
	const number = text.match(/\d+(?:[.,]\d+)?/);
	return number && parseFloat(number[0].replace(',', '.')) > 0 ? text : null;
}

function normalizeValue(key, value) {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') return normalizeNumber(key, value);
	if (Array.isArray(value)) {
		const items = value
			.map((item) => (typeof item === 'string' ? normalizeText(item) : item))
			.filter((item) => item !== null && item !== undefined);
		return items.length > 0 ? items : null;
	}
	if (typeof value !== 'string') return value;
	const text = normalizeText(value);
	if (text === null) return null;
	if (MEASUREMENT_PROPERTIES.includes(key)) return normalizeMeasurement(text);
	if (PROPERTIES[key]?.type === 'number') {
		const number = Number(text);
		return Number.isNaN(number) ? text : normalizeNumber(key, number);
	}
	return text;
}

// Replace placeholder values the model returns for missing facts (e.g., ",null,", -1, 111111) with null
export function normalizeFacts(facts) {
	const normalized = {};
	for (const [key, value] of Object.entries(facts || {})) {
		if (key === 'other_facts') {
			normalized[key] = (Array.isArray(value) ? value : []).filter(
				(fact) =>
					typeof fact?.label === 'string' &&
					normalizeText(fact.label) !== null &&
					typeof fact.description === 'string' &&
					normalizeText(fact.description) !== null
			);
		} else {
			normalized[key] = normalizeValue(key, value);
		}
	}
	return normalized;
}
