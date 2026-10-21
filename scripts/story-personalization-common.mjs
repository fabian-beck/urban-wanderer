// Study definitions shared by the story personalization scripts and the paper
// supplement (scripts/supplement-materials.mjs): the default values of the
// varied preferences, the judge questions and input, and the interest focus gain.

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const { AI_MODELS, FAMILIARITY, GUIDE_CHARACTERS, LABELS, LANGUAGES } = await import(
	pathToFileURL(path.join(rootDir, 'src/constants/ui-config.js'))
);

const ALL_LABELS = LABELS.map((label) => label.value);

export const DEFAULT_VALUE_SETS = {
	guideCharacter: GUIDE_CHARACTERS.map((character) => character.value),
	familiarity: FAMILIARITY.map((option) => option.value),
	lang: LANGUAGES.map((option) => option.value),
	labels: ['ALL', 'NONE', ...ALL_LABELS],
	aiModelAdvanced: AI_MODELS.ADVANCED.map((option) => option.value)
};

export const SCALE_MIN = 1;
export const SCALE_MAX = 5;
// Topic probability from which a text counts as focusing on the topic
export const TOPIC_FOCUS_THRESHOLD = 0.5;
// Score questions return the probability-weighted level index (0 = first level),
// shifted by SCALE_MIN onto the 1–5 scale.
export const DIMENSIONS = [
	{
		key: 'difficulty',
		name: 'Language difficulty',
		low: 'simple',
		high: 'advanced',
		instructions:
			'Rate the language difficulty of the text: sentence structure, vocabulary and density of argumentation. Ignore what the text is about.',
		levels: [
			{
				label: 'very simple',
				description: 'Short sentences and everyday words, understandable for a child'
			},
			{ label: 'simple' },
			{ label: 'moderate' },
			{ label: 'advanced' },
			{
				label: 'very advanced',
				description: 'Complex syntax, specialist vocabulary, dense argumentation'
			}
		]
	},
	{
		key: 'formality',
		name: 'Language formality',
		low: 'casual',
		high: 'formal',
		instructions:
			'Rate the language formality of the text: tone, register and how the reader is addressed. Ignore what the text is about.',
		levels: [
			{
				label: 'very casual',
				description: 'Colloquial, playful, addresses the reader informally'
			},
			{ label: 'casual' },
			{ label: 'balanced' },
			{ label: 'formal' },
			{ label: 'very formal', description: 'Neutral, distant, written standard' }
		]
	},
	{
		key: 'depth',
		name: 'Depth of information',
		low: 'superficial',
		high: 'in-depth',
		instructions:
			'Rate the depth of information in the text: how specific and explanatory it is. Ignore its language style.',
		levels: [
			{ label: 'superficial', description: 'Only generic statements' },
			{ label: 'shallow' },
			{ label: 'moderate' },
			{ label: 'detailed' },
			{
				label: 'in-depth',
				description: 'Specific facts, dates, names, explanations of causes and background'
			}
		]
	},
	{
		key: 'breadth',
		name: 'Breadth of information',
		low: 'narrow',
		high: 'broad',
		instructions:
			'Rate the breadth of information in the text: how many different places or aspects it covers. Ignore its language style.',
		levels: [
			{ label: 'narrow', description: 'A single aspect of a single place' },
			{ label: 'limited' },
			{ label: 'moderate' },
			{ label: 'wide' },
			{ label: 'broad', description: 'Many different places or aspects' }
		]
	},
	{
		key: 'priorKnowledge',
		name: 'Assumed prior knowledge',
		low: 'newcomer',
		high: 'local',
		instructions:
			'Rate how much prior knowledge of the area the text assumes: whether it orients the reader and introduces the places and their basics, or takes them for granted and goes for lesser-known details. Ignore its language style.',
		levels: [
			{
				label: 'none',
				description:
					'Written for a first-time visitor: orients the reader, introduces the landmarks and explains the basics'
			},
			{ label: 'little' },
			{ label: 'some' },
			{ label: 'considerable' },
			{
				label: 'local knowledge',
				description:
					'Written for a local: takes the landmarks and basics for granted and focuses on lesser-known details'
			}
		]
	}
];

// Score questions first, then one predicate per topic, so answers can be
// matched by index.
export const JUDGE_QUESTIONS = [
	...DIMENSIONS.map((dimension) => ({
		type: 'score',
		name: dimension.key,
		instructions: dimension.instructions,
		levels: dimension.levels
	})),
	...LABELS.map((label) => ({
		type: 'predicate',
		name: `topic_${label.value.toLowerCase()}`,
		instructions: `Does the text substantially focus on the topic "${label.value.toLowerCase()}" (${label.description})? Only if a noticeable part of the text is about it, not if it is mentioned in passing.`
	}))
];

export function buildJudgeInput(text, contextDescription = '') {
	return `A location guide app produced the following text about a place. Judge only the text itself, not any intent behind it.
${contextDescription}
Text to rate:

"""
${text}
"""`;
}

function mean(values) {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Interest focus gain per text with exactly one preferred interest: its
// probability of focusing on that interest minus the baseline, the mean
// probability for the same interest in texts at the same location that do not
// prefer it. Without the baseline, places that suggest a topic anyway (e.g.,
// history in an old town) would look like successful personalization.
export function computeFocusGains(rows) {
	const locationOf = (row) => row.varied?.location ?? '';
	const baselines = new Map();
	const baselineOf = (label, location) => {
		const key = `${label}@${location}`;
		if (!baselines.has(key)) {
			const values = rows
				.filter(
					(row) => locationOf(row) === location && !(row.preferences?.labels || []).includes(label)
				)
				.map((row) => row.judgment.topics[label]);
			baselines.set(key, values.length ? mean(values) : null);
		}
		return baselines.get(key);
	};
	const gains = new Map();
	for (const row of rows) {
		const labels = row.preferences?.labels || [];
		if (labels.length !== 1) continue;
		const baseline = baselineOf(labels[0], locationOf(row));
		if (baseline !== null) {
			gains.set(row, row.judgment.topics[labels[0]] - baseline);
		}
	}
	return gains;
}
