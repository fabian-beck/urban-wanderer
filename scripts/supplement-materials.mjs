#!/usr/bin/env node
// Generates material for the paper supplement (paper/supplement/generated/):
// - the prompts of all AI tasks, captured from the app's own prompt builders with
//   placeholder inputs («...») and a stubbed fetch, so no request leaves the machine
// - the JSON schemas and an overview of the tasks (model tier, reasoning effort, output)
// - app constants as LaTeX macros and tables (place classes, guide characters, familiarity)
//
//   node scripts/supplement-materials.mjs [--out <dir>]

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outArgIndex = process.argv.indexOf('--out');
const outDir = path.resolve(
	outArgIndex > -1
		? process.argv[outArgIndex + 1]
		: path.join(rootDir, 'paper/supplement/generated')
);

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
const { formatMapExcerpt, formatRelativePosition } = await importApp('src/util/map-excerpt.js');
const personalization = await importApp('src/util/personalization.js');

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

const relativePositions = [herePlace, nearbyPlace].map((place) =>
	formatRelativePosition(place, COORDINATES)
);
const mapExcerptText = formatMapExcerpt(MAP_EXCERPT, [herePlace, nearbyPlace]);
const walkContextFull = walkUtil.buildWalkPromptContext(walk, { fullStories: true });
const walkContextShort = walkUtil.buildWalkPromptContext(walk);
const walkRecapContext = walkUtil.buildWalkRecapContext(walk, PREFERENCES);
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
	...relativePositions.map((text) => [text, '«distance and direction»']),
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
		replacements: [...COMMON]
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

function guideCharacterRows() {
	return uiConfig.GUIDE_CHARACTERS.map((guide) => {
		const length = { ...uiConfig.STORY_LENGTH, ...guide.storyLength };
		const lengths = guide.storyLength
			? `first part ${length.MIN_PARAGRAPHS}--${length.MAX_PARAGRAPHS}, continuations ${length.CONTINUATION_MIN_PARAGRAPHS}--${length.CONTINUATION_MAX_PARAGRAPHS}`
			: '--';
		const instructions = [
			guide.storyInstructions && `\\textbf{Story:} ${latexEscape(guide.storyInstructions)}`,
			guide.commentInstructions && `\\textbf{Comment:} ${latexEscape(guide.commentInstructions)}`
		]
			.filter(Boolean)
			.join('\\par ')
			.replace(/\n/g, '\\par ');
		return `${latexEscape(guide.value)} & \\emph{${guide.germanAddress}} & ${instructions || '--'} & ${lengths} \\\\`;
	}).join('\n');
}

function familiarityRows() {
	return uiConfig.FAMILIARITY.map(
		(level) =>
			`${latexEscape(level.name)} & ${latexEscape(level.storyInstructions)} & ${latexEscape(level.commentInstructions)} \\\\`
	).join('\n');
}

function addressRows() {
	return Object.entries(uiConfig.GERMAN_ADDRESS_INSTRUCTIONS)
		.map(([form, text]) => `\\emph{${form}} & ${latexEscape(text)} \\\\`)
		.join('\n');
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
		write(`schemas/${task.id}.json`, `${JSON.stringify(format.schema, null, 2)}\n`);
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
	`${mapTemplate}\n\nLine format:\n- «name» («type») [= listed place "«title»"] — «distance» «direction», «to nearest edge, for areas», «runs «orientation», for lines»; «details»\n`
);
write('prompts/walk-context-full.txt', `${applyReplacements(walkContextFull, WALK_FIELDS)}\n`);
write(
	'prompts/walk-context-short.txt',
	`${applyReplacements(walkContextShort, [...WALK_FIELDS, ...STORY_EXCERPT(core.WALK_STORY_EXCERPT_LENGTH)])}\n`
);
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
write('guide-characters.tex', `${guideCharacterRows()}\n`);
write('familiarity.tex', `${familiarityRows()}\n`);
write('german-address.tex', `${addressRows()}\n`);
write('ai-tasks.tex', `${taskRows()}\n`);

process.stdout.write(
	`Captured ${capturedRequests.length} requests for ${tasks.length} tasks; wrote ${promptFiles} prompt files to ${path.relative(rootDir, outDir)}\n`
);
