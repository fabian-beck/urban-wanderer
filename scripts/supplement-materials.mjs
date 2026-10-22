#!/usr/bin/env node
// Generates material for the paper supplement (paper/supplement/generated/):
// - the prompts of all AI tasks, captured from the app's own prompt builders with
//   placeholder inputs («...») and a stubbed fetch, so no request leaves the machine
// - the output schemas in a compact notation and an overview of the tasks (model tier,
//   reasoning effort, output)
// - app constants as LaTeX macros and tables (place classes, guide characters, familiarity)
// - the personalization study: varied factors, judge input and questions, and with
//   --study-run the sampled configurations and results of a judged evaluation run
//   (study/, kept as is without --study-run)
// Text that a listing would repeat (class list, motto section) is replaced by a placeholder.
//
//   node scripts/supplement-materials.mjs [--out <dir>] [--study-run <dir> [--rename <key=label> ...]]

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = { out: path.join(rootDir, 'paper/supplement/generated'), studyRun: null, rename: {} };
for (let i = 2; i < process.argv.length; i++) {
	const arg = process.argv[i];
	const value = process.argv[++i];
	if (value === undefined) throw new Error(`Missing value for ${arg}`);
	if (arg === '--out') {
		args.out = value;
	} else if (arg === '--study-run') {
		args.studyRun = path.resolve(value);
	} else if (arg === '--rename') {
		const index = value.indexOf('=');
		if (index <= 0) throw new Error(`--rename expects key=label, got "${value}"`);
		args.rename[value.slice(0, index)] = value.slice(index + 1);
	} else {
		throw new Error(`Unknown argument: ${arg}`);
	}
}
const outDir = path.resolve(args.out);

const importApp = (file) => import(pathToFileURL(path.join(rootDir, file)));

// ---------------------------------------------------------------------------
// Stubbed environment: in-memory localStorage (empty caches, so every prompt is
// built) and a fetch that records OpenAI requests and answers them with a
// minimal response that satisfies the requested JSON schema.

const storage = new Map();
globalThis.localStorage = {
	getItem: (key) => (storage.has(key) ? storage.get(key) : null),
	setItem: (key, value) => storage.set(key, String(value)),
	removeItem: (key) => storage.delete(key),
	clear: () => storage.clear(),
	key: (index) => [...storage.keys()][index] ?? null,
	get length() {
		return storage.size;
	}
};

function emptyValueFor(schema) {
	switch (schema?.type) {
		case 'object':
			return Object.fromEntries(
				(schema.required || []).map((key) => [key, emptyValueFor(schema.properties[key])])
			);
		case 'array':
			return [];
		case 'number':
			return 0;
		default:
			return '';
	}
}

const capturedRequests = [];
globalThis.fetch = async (input, init = {}) => {
	const url = new URL(String(input?.url ?? input));
	if (url.hostname === 'api.openai.com') {
		const body = JSON.parse(init.body);
		capturedRequests.push(body);
		const schema = body.text?.format?.schema;
		const text = schema ? JSON.stringify(emptyValueFor(schema)) : '«generated text»';
		return Response.json({
			id: `resp_stub_${capturedRequests.length}`,
			object: 'response',
			status: 'completed',
			output: [
				{
					type: 'message',
					id: 'msg_stub',
					role: 'assistant',
					status: 'completed',
					content: [{ type: 'output_text', text, annotations: [] }]
				}
			],
			usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
		});
	}
	return Response.json({});
};

const core = await importApp('src/constants/core.js');
const cacheConfig = await importApp('src/constants/cache-config.js');
const uiConfig = await importApp('src/constants/ui-config.js');
const { CLASSES, PROPERTIES } = await importApp('src/constants/place-classes.js');
const { analyzePlaces } = await importApp('src/util/ai-analysis.js');
const { translatePlaceTitles } = await importApp('src/util/ai-translation.js');
const { buildFactsProperties, extractInsightsFromArticle, extractPlaceFacts, summarizeArticle } =
	await importApp('src/util/ai-facts.js');
const { extractHistoricEvents } = await importApp('src/util/ai-history.js');
const { generateLocationComment } = await importApp('src/util/ai-comment.js');
const { generateStory, generateWalkRecap } = await importApp('src/util/ai-story.js');
const walkUtil = await importApp('src/util/walk.js');
const { formatMapExcerpt, formatPlaceDistance } = await importApp('src/util/map-excerpt.js');
const personalization = await importApp('src/util/personalization.js');
const study = await importApp('scripts/story-personalization-common.mjs');

// ---------------------------------------------------------------------------
// Placeholder inputs

const PREFERENCES = {
	radius: 500,
	labels: ['HISTORY', 'ARCHITECTURE'],
	guideCharacter: 'kid-friendly (enthusiastic and using simple terms)',
	familiarity: 'unfamiliar',
	lang: 'de',
	sourceLanguages: ['de', 'en'],
	audio: false,
	aiModelSimple: uiConfig.AI_MODELS.DEFAULT_SIMPLE,
	aiModelAdvanced: uiConfig.AI_MODELS.DEFAULT_ADVANCED
};
const character = personalization.getGuideCharacter(PREFERENCES);
const familiarity = personalization.getFamiliarity(PREFERENCES);

const COORDINATES = {
	latitude: 49.89157,
	longitude: 10.88727,
	address: '«address»',
	road: '«road»',
	suburb: '«quarter»',
	town: '«town»',
	state: '«state»',
	country: '«country»'
};
const PLACE_TEXT = '«insights, else article text, else description, snippet, or OSM type»';
const herePlace = {
	title: '«place here»',
	labels: ['«labels»'],
	stars: '«stars»',
	insights: PLACE_TEXT,
	article: '«article text»',
	lat: 49.8917,
	lon: 10.8876,
	dist: 40
};
const nearbyPlace = {
	title: '«nearby place»',
	labels: ['«labels»'],
	stars: '«stars»',
	description: '«description, else snippet, else OSM type»',
	article: '«article text»',
	lat: 49.8935,
	lon: 10.8873,
	dist: 210
};
const surroundingPlaces = ['«quarter»', '«town»'].map((title) => ({
	title,
	type: 'address',
	stars: '«stars»',
	insights: PLACE_TEXT,
	article: '«article text»'
}));

const earlierStop = {
	latitude: 49.8933,
	longitude: 10.8899,
	address: '«address of an earlier stop»',
	road: '«road»',
	town: '«town»'
};
let walk = walkUtil.createWalk('«motto»');
walk = walkUtil.addWalkStop(walk, earlierStop, [
	{ title: '«place visited earlier»', labels: ['«labels»'], stars: 4, insights: '«place text»' }
]);
walk = walkUtil.addWalkStory(walk, '**«headline»**\n\n«full text of an earlier story»');
walk = walkUtil.addWalkStop(walk, COORDINATES, [herePlace], [{ ...nearbyPlace, stars: 3 }]);

const MAP_EXCERPT = {
	position: { latitude: COORDINATES.latitude, longitude: COORDINATES.longitude },
	radius: core.STORY_MAP_RADIUS,
	features: [],
	unnamedBuildings: []
};

// ---------------------------------------------------------------------------
// Replacements that turn the instantiated prompts into templates

const placeDistances = [herePlace, nearbyPlace].map((place) =>
	formatPlaceDistance(place, COORDINATES)
);
const mapExcerptText = formatMapExcerpt(MAP_EXCERPT, [herePlace, nearbyPlace]);
const walkContextFull = walkUtil.buildWalkPromptContext(walk, { fullStories: true });
const walkContextShort = walkUtil.buildWalkPromptContext(walk);
const walkRecapContext = walkUtil.buildWalkRecapContext(walk, PREFERENCES);
const mottoSection = walkUtil.buildWalkMottoPromptContext(walk);
const classList = Object.entries(CLASSES)
	.map(([name, cls]) => `- ${name}: ${cls.description}`)
	.join('\n');
const addressInstruction = personalization.buildAddressInstruction(PREFERENCES);
const selectedLabels = PREFERENCES.labels.map((label) => `- ${label}`).join('\n');
const deselectedLabels = uiConfig.LABELS.map((label) => label.value)
	.filter((label) => !PREFERENCES.labels.includes(label))
	.map((label) => `- ${label}`)
	.join('\n');

const WALK_FIELDS = [
	[/started \d+ min ago/g, 'started «duration» ago'],
	[/with \d+ stops/g, 'with «number of» stops'],
	[/roughly \d+(\.\d+)? k?m covered/g, 'roughly «distance» covered'],
	[
		/duration \d+ min, \d+ stops, roughly \d+(\.\d+)? k?m/g,
		'duration «duration», «number of» stops, roughly «distance»'
	],
	[/\b\d{1,2}:\d{2}( ?[AP]M)?/g, '«time»'],
	[/Rating: 4;/g, 'Rating: «stars»;'],
	[/, rating 3, about \d+ m from/g, ', rating «stars», about «distance» m from']
];
const STORY_EXCERPT = (length) => [
	['«full text of an earlier story»', `«story excerpt, up to ${length} characters»`]
];
const RECAP_PREFERENCES = [
	[
		`User's interests: ${uiConfig.LABELS.map((label) => label.value)
			.filter((label) => PREFERENCES.labels.includes(label))
			.join(', ')}.`,
		"User's interests: «selected interests, or none selected»."
	],
	[
		`Familiarity with the area: ${familiarity.name}.`,
		'Familiarity with the area: «familiarity level».'
	]
];

const COMMON = [
	[`Answer in language '${PREFERENCES.lang}'`, "Answer in language '«language code»'"],
	...placeDistances.map((text) => [text, '«distance»']),
	[/Distance: \d+ m/g, 'Distance: «distance» m'],
	[/, distance: \d+m/g, ', distance: «distance»m']
];

const PERSONALIZATION = [
	[
		character.storyInstructions,
		'«character-specific story instructions, if any (see guide characters)»'
	],
	[
		character.commentInstructions,
		'«character-specific comment instructions, if any (see guide characters)»'
	],
	[familiarity.storyInstructions, '«familiarity instructions (see familiarity levels)»'],
	[familiarity.commentInstructions, '«familiarity comment instructions (see familiarity levels)»'],
	[familiarity.name, '«familiarity level»'],
	[addressInstruction, '«form of address, German only (see forms of address)»'],
	[character.value, '«guide character»']
];

const STORY = [
	[mapExcerptText, '«map excerpt (see map excerpt template)»'],
	[walkContextFull, '«walk context with earlier stories in full (see walk context)»'],
	[selectedLabels, '«selected interests, one per line, or "- no specific topics selected"»'],
	[deselectedLabels, '«interests not selected, one per line, or "- none"»'],
	[/The story should be [\d to]+ paragraphs/g, 'The story should be «paragraph range» paragraphs'],
	[/Write [\d to]+ paragraphs/g, 'Write «paragraph range» paragraphs']
];

function applyReplacements(text, replacements) {
	let result = text;
	for (const [from, to] of replacements) {
		if (!from) continue;
		result = typeof from === 'string' ? result.split(from).join(to) : result.replace(from, to);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Capture

const tasks = [];

async function capture(task, call) {
	const before = capturedRequests.length;
	try {
		await call();
	} catch {
		// The stubbed answers are empty; only the request matters here
	}
	const request = capturedRequests[before];
	if (!request) {
		throw new Error(`No request captured for ${task.id}`);
	}
	tasks.push({ ...task, request });
}

await capture(
	{
		id: 'analysis',
		name: 'Place analysis',
		trigger: 'Every location update, for places without cached analysis',
		replacements: [
			...COMMON,
			[classList, '«one line per class: "- NAME: description" (see place classes)»']
		]
	},
	() =>
		analyzePlaces(
			[
				{
					title: '«title»',
					type: '«OSM tag value»',
					dist: 120,
					snippet: '«Wikipedia snippet or OSM description»'
				}
			],
			PREFERENCES
		)
);
await capture(
	{
		id: 'translation',
		name: 'Title translation',
		trigger: 'Every location update, for visible places from another language edition',
		replacements: [
			[`names to ${PREFERENCES.lang}.`, 'names to «language code».'],
			[`(${PREFERENCES.lang})`, '(«language code»)']
		]
	},
	() =>
		translatePlaceTitles(
			[{ title: '«title»', lang: 'en', stars: 3 }],
			COORDINATES,
			PREFERENCES,
			() => true
		)
);
await capture(
	{
		id: 'insights',
		name: 'Article insights',
		trigger: 'Every location update, for places here and surrounding places with an article',
		replacements: [...COMMON]
	},
	() => extractInsightsFromArticle('«article text»', PREFERENCES)
);
await capture(
	{
		id: 'summary',
		name: 'Place summary',
		trigger: 'Opening the place details',
		replacements: [...COMMON]
	},
	() => summarizeArticle('«article text, else OSM description»', PREFERENCES)
);
const factsPlace = {
	title: '«title»',
	cls: 'BUILDING',
	article: '«article text, else description, else snippet»'
};
await capture(
	{
		id: 'facts',
		name: 'Fact extraction',
		trigger: 'Opening the place details',
		replacements: [...COMMON, ['(BUILDING)', '(«class»)']],
		// Wikidata lookups are stubbed, so the section the app appends when Wikidata has the place
		// (getWikidataContext in src/util/wikidata.js) is added as a placeholder
		appendix: '\n\nSTRUCTURED DATA FROM WIKIDATA:\n«Wikidata properties and values, one per line»'
	},
	() =>
		extractPlaceFacts(factsPlace, buildFactsProperties(factsPlace.cls), COORDINATES, PREFERENCES)
);
await capture(
	{
		id: 'history',
		name: 'Historic events',
		trigger: 'Every location update (background), shown in the history timeline',
		replacements: [...COMMON]
	},
	() =>
		extractHistoricEvents([herePlace], [nearbyPlace], surroundingPlaces, COORDINATES, PREFERENCES)
);
await capture(
	{
		id: 'comment',
		name: 'Location comment',
		trigger: 'Every location update, shown below the map',
		replacements: [
			...COMMON,
			[walkContextShort, '«walk context with story excerpts (see walk context)»'],
			[mottoSection, '«motto section (see story prompt)»'],
			...PERSONALIZATION
		]
	},
	() => generateLocationComment([herePlace], surroundingPlaces, COORDINATES, PREFERENCES, walk)
);
await capture(
	{
		id: 'story',
		name: 'Story, first part',
		trigger: 'Every location update (background)',
		replacements: [...COMMON, ...STORY, ...PERSONALIZATION]
	},
	() =>
		generateStory(
			[],
			[herePlace],
			[nearbyPlace],
			surroundingPlaces,
			COORDINATES,
			PREFERENCES,
			null,
			walk,
			MAP_EXCERPT
		)
);
await capture(
	{
		id: 'story-continuation',
		name: 'Story, continuation',
		trigger: '"Tell me more" (preloaded after each part)',
		replacements: [...COMMON, ...STORY, ...PERSONALIZATION]
	},
	() =>
		generateStory(
			['«previous story part»'],
			[herePlace],
			[nearbyPlace],
			surroundingPlaces,
			COORDINATES,
			PREFERENCES,
			'resp_previous',
			walk,
			MAP_EXCERPT
		)
);
await capture(
	{
		id: 'recap',
		name: 'Walk recap',
		trigger: 'Opening the walk overview',
		replacements: [
			...COMMON,
			[walkRecapContext, '«walk material (see walk recap material)»'],
			[mottoSection, '«motto section (see story prompt)»'],
			...PERSONALIZATION
		]
	},
	() => generateWalkRecap(walk, PREFERENCES)
);

// ---------------------------------------------------------------------------
// Output helpers

function latexEscape(value) {
	return String(value)
		.replace(/\\/g, '\\textbackslash{}')
		.replace(/([&%$#_{}])/g, '\\$1')
		.replace(/~/g, '\\textasciitilde{}')
		.replace(/\^/g, '\\textasciicircum{}')
		.replace(/"([^"]*)"/g, "``$1''");
}

function macroName(...parts) {
	return (
		'c' +
		parts
			.join('_')
			.toLowerCase()
			.split('_')
			.filter(Boolean)
			.map((word) => word[0].toUpperCase() + word.slice(1))
			.join('')
	);
}

function formatDuration(ms) {
	const units = [
		['d', 24 * 60 * 60 * 1000],
		['h', 60 * 60 * 1000],
		['min', 60 * 1000],
		['s', 1000]
	];
	for (const [unit, size] of units) {
		if (ms >= size && ms % size === 0) return `${ms / size}~${unit}`;
	}
	return `${ms}~ms`;
}

function isDurationKey(key) {
	return /(_MS|_TTL|TTL|DURATION)$/.test(key) || key === 'CACHE_TTL';
}

function formatScalar(key, value) {
	if (typeof value === 'number') {
		return isDurationKey(key) ? formatDuration(value) : String(value);
	}
	if (typeof value === 'string') {
		const items = [...new Set(value.split('|'))];
		return items.length > 1 ? items.map(latexEscape).join(', ') : latexEscape(value);
	}
	return null;
}

function constantMacros(modules) {
	const lines = [];
	const seen = new Set();
	const add = (name, value) => {
		if (value === null || seen.has(name)) return;
		seen.add(name);
		lines.push(`\\newcommand{\\${name}}{${value}}`);
	};
	for (const module of modules) {
		for (const [key, value] of Object.entries(module)) {
			if (Array.isArray(value)) {
				if (value.every((item) => typeof item === 'string')) {
					add(macroName(key), value.map(latexEscape).join(', '));
				}
			} else if (value && typeof value === 'object') {
				for (const [subKey, subValue] of Object.entries(value)) {
					if (typeof subValue !== 'object') {
						add(macroName(key, subKey), formatScalar(subKey, subValue));
					}
				}
			} else {
				add(macroName(key), formatScalar(key, value));
			}
		}
	}
	add('cSourceCommit', execSync('git rev-parse --short HEAD', { cwd: rootDir }).toString().trim());
	return `% Generated by scripts/supplement-materials.mjs from src/constants/; do not edit.\n${lines.join('\n')}\n`;
}

function placeClassRows() {
	return Object.entries(CLASSES)
		.map(([name, cls]) => {
			const radius = cls.nonGeo
				? '--'
				: `${cls.radius ?? core.PLACE_HERE_DEFAULT_RADIUS}${cls.radius ? '' : '*'}`;
			const properties = cls.nonGeo
				? '\\emph{non-geographic, removed}'
				: (cls.properties || [])
						.filter((property) => PROPERTIES[property])
						.map(latexEscape)
						.join(', ');
			return `\\texttt{${latexEscape(name)}} & ${latexEscape(cls.description)} & ${radius} & ${properties} \\\\`;
		})
		.join('\n');
}

const guideSlug = (guide) => withoutQualifier(guide.value).replace(/\W+/g, '-');

// Inline list of the guide characters with their German form of address and story length
function guideCharacterList() {
	return uiConfig.GUIDE_CHARACTERS.map((guide) => {
		const length = { ...uiConfig.STORY_LENGTH, ...guide.storyLength };
		const details = [
			`\\emph{${guide.germanAddress}}`,
			guide.storyLength &&
				`first story part ${length.MIN_PARAGRAPHS}--${length.MAX_PARAGRAPHS} and continuations ${length.CONTINUATION_MIN_PARAGRAPHS}--${length.CONTINUATION_MAX_PARAGRAPHS} paragraphs`
		].filter(Boolean);
		return `\\textit{${latexEscape(guide.value)}} (${details.join(', ')})`;
	}).join(', ');
}

function guideInstructions(guide) {
	return [
		guide.storyInstructions && `Story instructions:\n${guide.storyInstructions}`,
		guide.commentInstructions && `Comment instructions:\n${guide.commentInstructions}`
	]
		.filter(Boolean)
		.join('\n\n');
}

function familiarityRows() {
	return uiConfig.FAMILIARITY.map(
		(level) =>
			`${latexEscape(level.name)} & ${latexEscape(level.storyInstructions)} & ${latexEscape(level.commentInstructions)} \\\\`
	).join('\n');
}

function addressInstructions() {
	return Object.entries(uiConfig.GERMAN_ADDRESS_INSTRUCTIONS)
		.map(([form, text]) => `${form}: ${text}`)
		.join('\n');
}

// Output schemas in a compact notation: one field per line, [T] for arrays, "| null" for
// nullable fields, and the schema's descriptions as // comments. Objects whose fields carry
// no descriptions stay on one line. The notation leaves out required and
// additionalProperties, so it only accepts objects that require all fields and allow no others.
const fieldDescription = (schema) => schema.description ?? schema.items?.description;

function hasDescriptions(schema) {
	return Boolean(
		schema &&
		(schema.description ||
			hasDescriptions(schema.items) ||
			Object.values(schema.properties || {}).some(hasDescriptions))
	);
}

function schemaLines(schema) {
	const types = [].concat(schema.type);
	const type = types.find((name) => name !== 'null');
	let lines;
	if (type === 'object') {
		const fields = schemaFieldLines(schema);
		lines = Object.values(schema.properties).some(hasDescriptions)
			? ['{', ...fields.map((line) => `  ${line}`), '}']
			: [`{ ${fields.join(', ')} }`];
	} else if (type === 'array') {
		const [first, ...rest] = schemaLines(schema.items);
		lines = [`[${first}`, ...rest];
		lines[lines.length - 1] += ']';
	} else {
		lines = [type];
	}
	if (types.includes('null')) {
		lines[lines.length - 1] += ' | null';
	}
	return lines;
}

function schemaFieldLines(schema) {
	const fields = Object.entries(schema.properties);
	const required = new Set(schema.required);
	if (schema.additionalProperties !== false || fields.some(([key]) => !required.has(key))) {
		throw new Error('The compact schema notation expects objects that require all fields');
	}
	return fields.flatMap(([key, field]) => {
		const [first, ...rest] = schemaLines(field);
		const description = fieldDescription(field);
		return [`${key}: ${first}${description ? `  // ${description}` : ''}`, ...rest];
	});
}

// Score questions with their levels, then the topic questions as one template row
function judgeQuestionRows() {
	const rows = [];
	for (const question of study.JUDGE_QUESTIONS.filter(({ type }) => type === 'score')) {
		const lines = [];
		let plain = [];
		question.levels.forEach((level, index) => {
			const text = `${index + 1}~\\emph{${latexEscape(level.label)}}`;
			if (level.description) {
				if (plain.length) lines.push(plain.join(', '));
				plain = [];
				lines.push(`${text}: ${latexEscape(level.description)}`);
			} else {
				plain.push(text);
			}
		});
		if (plain.length) lines.push(plain.join(', '));
		const name = study.DIMENSIONS.find((dimension) => dimension.key === question.name).name;
		rows.push(
			`${name} & ${latexEscape(question.instructions)} & ${lines.join(' \\newline ')} \\\\`
		);
	}
	const templates = new Set(
		study.JUDGE_QUESTIONS.filter(({ type }) => type === 'predicate').map((question) => {
			const label = uiConfig.LABELS.find(
				({ value }) => question.name === `topic_${value.toLowerCase()}`
			);
			return question.instructions
				.replace(`"${label.value.toLowerCase()}"`, '"«interest»"')
				.replace(`(${label.description})`, '(«description»)');
		})
	);
	if (templates.size !== 1) {
		throw new Error('The topic questions of the judge differ beyond interest and description');
	}
	rows.push(
		`Topic focus (one per interest) & ${latexEscape([...templates][0])} & \\emph{yes} or \\emph{no} \\\\`
	);
	return rows.join('\n');
}

function modelTier(model) {
	return model === PREFERENCES.aiModelSimple ? 'simple' : 'advanced';
}

function taskRows() {
	return tasks
		.map(({ name, trigger, request }) => {
			const format = request.text?.format;
			const output =
				format?.type === 'json_schema' ? `JSON (\\texttt{${latexEscape(format.name)}})` : 'text';
			const effort = request.reasoning?.effort || '--';
			return `${latexEscape(name)} & ${latexEscape(trigger)} & ${modelTier(request.model)} & ${effort} & ${output} \\\\`;
		})
		.join('\n');
}

function messagesOf(task) {
	const { request } = task;
	const input =
		typeof request.input === 'string' ? [{ role: 'user', content: request.input }] : request.input;
	return input.map((message, index) => {
		let content = message.content;
		if (message.role === 'user') {
			try {
				content = JSON.stringify(JSON.parse(content), null, 2);
			} catch {
				// plain text message
			}
		}
		content = applyReplacements(content, task.replacements).replace(/^\n+/, '').trimEnd();
		if (task.appendix && index === input.length - 1) {
			content += task.appendix;
		}
		return { role: message.role, content };
	});
}

// ---------------------------------------------------------------------------
// Personalization study

const STUDY_FACTORS = ['guideCharacter', 'familiarity', 'labels', 'lang', 'aiModelAdvanced'];
const STUDY_FACTOR_NAMES = {
	guideCharacter: 'Guide character',
	familiarity: 'Familiarity',
	labels: 'Interests',
	lang: 'Output language',
	aiModelAdvanced: 'Story model',
	location: 'Position'
};
const ALL_LABELS = uiConfig.LABELS.map((label) => label.value);

const withoutQualifier = (text) => text.replace(/\s*\(.*\)$/, '');
const labelName = (value) =>
	uiConfig.LABELS.find((label) => label.value === value).name.replace(/^\S+\s+/, '');
const optionName = (options, value) => options.find((option) => option.value === value)?.name;

function labelsOf(value) {
	if (Array.isArray(value)) return value;
	if (value === 'ALL') return ALL_LABELS;
	if (value === 'NONE') return [];
	return value.split('+');
}

// Level of the labels factor (ALL, NONE, or a single label) for a configuration's labels
function labelsLevel(labels) {
	if (labels.length === ALL_LABELS.length) return 'ALL';
	return labels.length ? labels.join('+') : 'NONE';
}

// Shared prefix of the story model names up to its last dash (e.g., gpt-6-)
const modelPrefix = (() => {
	const [first, ...others] = study.DEFAULT_VALUE_SETS.aiModelAdvanced;
	let prefix = first.slice(0, first.lastIndexOf('-') + 1);
	while (prefix && !others.every((model) => model.startsWith(prefix))) {
		prefix = prefix.slice(0, prefix.slice(0, -1).lastIndexOf('-') + 1);
	}
	return prefix;
})();

// Labels come as arrays (configurations) or as ALL, NONE, or a single label (judge summary)
function studyLevel(factor, value) {
	switch (factor) {
		case 'guideCharacter':
			return latexEscape(withoutQualifier(value));
		case 'familiarity':
			return latexEscape(withoutQualifier(optionName(uiConfig.FAMILIARITY, value)));
		case 'labels': {
			const labels = labelsOf(value);
			if (labels.length === ALL_LABELS.length) return 'all';
			return labels.length ? labels.map(labelName).join(', ') : 'none';
		}
		case 'lang':
			return optionName(uiConfig.LANGUAGES, value);
		case 'aiModelAdvanced':
			return `\\texttt{${latexEscape(value)}}`;
		default:
			return args.rename[value] ?? latexEscape(value);
	}
}

function studyFactorRows() {
	return STUDY_FACTORS.map((factor) => {
		const values = study.DEFAULT_VALUE_SETS[factor];
		const levels =
			factor === 'labels'
				? `all, none, or one of ${ALL_LABELS.map(labelName).join(', ')}`
				: values.map((value) => studyLevel(factor, value)).join(', ');
		return `${STUDY_FACTOR_NAMES[factor]} & ${values.length} & ${levels} \\\\`;
	}).join('\n');
}

const decimals = (value) => value.toFixed(2);
const range = (values, format = String) => {
	const [min, max] = [Math.min(...values), Math.max(...values)];
	return min === max ? format(min) : `${format(min)}--${format(max)}`;
};
const signed = (value) => `${value < 0 ? '\\textminus' : '+'}${decimals(Math.abs(value))}`;
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

// Sampled configurations and results of a judged run of
// story-personalization-eval.mjs and story-personalization-judge.mjs
function writeStudyMaterials(runDir) {
	const readJson = (file) => JSON.parse(readFileSync(path.join(runDir, file), 'utf8'));
	const run = readJson('run.json');
	const judgeMeta = readJson('judgments-meta.json');
	const summary = readJson('judgments-summary.json');
	const rows = readFileSync(path.join(runDir, 'judgments.jsonl'), 'utf8')
		.split('\n')
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line))
		.filter((row) => row.judgment);
	const locations = run.args.locations;
	const fixedPreferences = run.contexts[0].preferences;
	const gains = study.computeFocusGains(rows);
	const meanGain = (group) => {
		const values = group.filter((row) => gains.has(row)).map((row) => gains.get(row));
		return values.length ? average(values) : null;
	};
	const levelOrder = {
		...study.DEFAULT_VALUE_SETS,
		location: locations.map((location) => location.name)
	};
	const orderedLevels = (factor) =>
		[...summary.factors[factor]].sort(
			(a, b) => levelOrder[factor].indexOf(a.level) - levelOrder[factor].indexOf(b.level)
		);

	const studyDir = path.join(outDir, 'study');
	rmSync(studyDir, { recursive: true, force: true });
	mkdirSync(studyDir, { recursive: true });
	const writeStudy = (file, lines) =>
		writeFileSync(path.join(studyDir, file), `${[].concat(lines).join('\n')}\n`);

	const macros = {
		cStudyRun: latexEscape(path.basename(runDir)),
		cStudyCommit: run.gitCommit,
		cStudySample: run.design.combinations,
		cStudyCombinations: run.design.fullSize.toLocaleString('en-US'),
		cStudySeed: run.design.seed,
		cStudyPositions: locations.length,
		cStudyStories: rows.length,
		cStudyContextPipelines: run.contexts.length,
		cStudyRadius: fixedPreferences.radius,
		cStudySourceLanguages: fixedPreferences.sourceLanguages
			.map((code) => optionName(uiConfig.SOURCE_LANGUAGES, code))
			.join(' and '),
		cStudySimpleModel: latexEscape(fixedPreferences.aiModelSimple),
		cStudyServiceTier: run.args.flex ? 'flex' : 'standard',
		cStudyJudgeModel: latexEscape(judgeMeta.model),
		cStudyFocusGain: signed(meanGain(rows)),
		cStudyJudgeConfidence: range(
			Object.values(summary.uncertainty.dimensions).map(({ confidence }) => confidence),
			decimals
		),
		cStudyTopicCertainty: decimals(summary.uncertainty.topicCertainty),
		cStudyModelPrefix: latexEscape(modelPrefix)
	};
	writeStudy('macros.tex', [
		`% Generated by scripts/supplement-materials.mjs from ${path.basename(runDir)}; do not edit.`,
		...Object.entries(macros).map(([name, value]) => `\\newcommand{\\${name}}{${value}}`)
	]);

	writeStudy(
		'positions.tex',
		locations.map((location) => {
			const contexts = run.contexts.filter((context) => context.location.name === location.name);
			const english = contexts.find((context) => context.preferences.lang === 'en') ?? contexts[0];
			const count = (key) => range(contexts.map((context) => context[key].length));
			return `${studyLevel('location', location.name)} & ${location.lat}, ${location.lon} & ${latexEscape(english.address)} & ${count('here')} & ${count('nearby')} & ${english.mapFeatures} \\\\`;
		})
	);

	// Two blocks side by side, sorted by the factor levels
	const levelIndex = (factor, value) =>
		study.DEFAULT_VALUE_SETS[factor].indexOf(factor === 'labels' ? labelsLevel(value) : value);
	const configurations = run.configs
		.filter((config) => config.location.name === locations[0].name)
		.map((config) => config.varied)
		.sort((a, b) => {
			for (const factor of STUDY_FACTORS) {
				const difference = levelIndex(factor, a[factor]) - levelIndex(factor, b[factor]);
				if (difference) return difference;
			}
			return 0;
		});
	const configurationCells = (varied) =>
		varied
			? [
					latexEscape(withoutQualifier(varied.guideCharacter).split(' ')[0]),
					levelIndex('familiarity', varied.familiarity) + 1,
					studyLevel('labels', varied.labels),
					varied.lang.toUpperCase(),
					latexEscape(varied.aiModelAdvanced.slice(modelPrefix.length))
				].join(' & ')
			: ' & & & & ';
	const half = Math.ceil(configurations.length / 2);
	writeStudy(
		'configurations.tex',
		configurations
			.slice(0, half)
			.map(
				(varied, index) =>
					`${configurationCells(varied)} & ${configurationCells(configurations[half + index])} \\\\`
			)
	);

	const meanCells = (dimensions) =>
		study.DIMENSIONS.map((dimension) => {
			const stats = dimensions[dimension.key];
			return `${decimals(stats.mean)} (${decimals(stats.sd)})`;
		}).join(' & ');
	const columns = 2 + study.DIMENSIONS.length;
	const levelRows = [
		`All stories & ${rows.length} & ${meanCells(summary.overall.dimensions)} \\\\`
	];
	for (const factor of [...STUDY_FACTORS, 'location']) {
		levelRows.push(
			'\\midrule',
			`\\multicolumn{${columns}}{@{}l}{\\textit{${STUDY_FACTOR_NAMES[factor]}}} \\\\`
		);
		for (const group of orderedLevels(factor)) {
			levelRows.push(
				`\\quad ${studyLevel(factor, group.level)} & ${group.n} & ${meanCells(group.dimensions)} \\\\`
			);
		}
	}
	writeStudy('level-means.tex', levelRows);

	const topicHeader = ALL_LABELS.map((label) => `\\rotatebox{90}{\\textbf{${labelName(label)}}}`);
	writeStudy('topic-focus.tex', [
		`\\textbf{Interests} & $n$ & ${topicHeader.join(' & ')} & \\textbf{Focus gain} \\\\`,
		'\\midrule',
		...orderedLevels('labels').map((group) => {
			const preferred = labelsOf(group.level);
			const cells = ALL_LABELS.map((label) => {
				const probability = group.topics[label];
				const text = decimals(probability).replace(/^0/, '');
				const shade = Math.round(probability * 40);
				const cell = preferred.length === 1 && preferred[0] === label ? `\\textbf{${text}}` : text;
				return shade ? `\\cellcolor{black!${shade}}${cell}` : cell;
			});
			const gain =
				preferred.length === 1
					? meanGain(
							rows.filter(
								(row) =>
									row.preferences.labels.length === 1 && row.preferences.labels[0] === preferred[0]
							)
						)
					: null;
			return `${studyLevel('labels', group.level)} & ${group.n} & ${cells.join(' & ')} & ${gain === null ? '--' : signed(gain)} \\\\`;
		})
	]);
}

// ---------------------------------------------------------------------------
// Write

for (const dir of ['prompts', 'schemas']) {
	rmSync(path.join(outDir, dir), { recursive: true, force: true });
	mkdirSync(path.join(outDir, dir), { recursive: true });
}
const write = (file, content) => writeFileSync(path.join(outDir, file), content);

let promptFiles = 0;
for (const task of tasks) {
	messagesOf(task).forEach(({ role, content }, index) => {
		write(`prompts/${task.id}-${index + 1}-${role}.txt`, `${content}\n`);
		promptFiles++;
	});
	const format = task.request.text?.format;
	if (format?.schema) {
		write(`schemas/${task.id}.txt`, `${schemaFieldLines(format.schema).join('\n')}\n`);
	}
}

const templateFixes = [
	[`${MAP_EXCERPT.position.latitude.toFixed(5)}`, '«latitude»'],
	[`${MAP_EXCERPT.position.longitude.toFixed(5)}`, '«longitude»'],
	['- no mapped area contains ⌖', '«one line per mapped area or building that contains ⌖»'],
	[
		'- no mapped streets nearby',
		`«one line per street or path, up to ${core.STORY_MAP_STREET_LIMIT}»`
	],
	[
		`- no further buildings within ${core.STORY_MAP_IMMEDIATE_RADIUS} m of ⌖`,
		`«count and types of unnamed buildings within ${core.STORY_MAP_IMMEDIATE_RADIUS} m of ⌖, nearest one»`
	]
];
const ringLimits = Object.values(core.STORY_MAP_RING_LIMITS);
let ringIndex = 0;
const mapTemplate = applyReplacements(mapExcerptText, templateFixes).replace(
	/- no mapped features/g,
	() => `«one line per mapped feature, up to ${ringLimits[ringIndex++]}»`
);
write(
	'prompts/map-excerpt.txt',
	`${mapTemplate}\n\nLine format:\n- «name» («type») [= listed place "«title»"] — «distance», «to nearest edge, for areas»; «details»\n`
);
write('prompts/walk-context-full.txt', `${applyReplacements(walkContextFull, WALK_FIELDS)}\n`);
write(
	'prompts/walk-recap-context.txt',
	`${applyReplacements(walkRecapContext, [
		...WALK_FIELDS,
		...RECAP_PREFERENCES,
		...STORY_EXCERPT(core.WALK_RECAP_STORY_EXCERPT_LENGTH)
	])}\n`
);

write('constants.tex', constantMacros([core, cacheConfig, uiConfig]));
write('place-classes.tex', `${placeClassRows()}\n`);
write('guide-characters.tex', `${guideCharacterList()}%\n`);
for (const guide of uiConfig.GUIDE_CHARACTERS.filter(guideInstructions)) {
	write(`prompts/guide-${guideSlug(guide)}.txt`, `${guideInstructions(guide)}\n`);
}
write('familiarity.tex', `${familiarityRows()}\n`);
write('prompts/german-address.txt', `${addressInstructions()}\n`);
write('ai-tasks.tex', `${taskRows()}\n`);

write('prompts/judge-input.txt', `${study.buildJudgeInput('«story text»')}\n`);
write('judge-questions.tex', `${judgeQuestionRows()}\n`);
write('study-factors.tex', `${studyFactorRows()}\n`);
if (args.studyRun) {
	writeStudyMaterials(args.studyRun);
}

process.stdout.write(
	`Captured ${capturedRequests.length} requests for ${tasks.length} tasks; wrote ${promptFiles} prompt files to ${path.relative(rootDir, outDir)}` +
		(args.studyRun ? `; study materials from ${path.basename(args.studyRun)}` : '') +
		'\n'
);
