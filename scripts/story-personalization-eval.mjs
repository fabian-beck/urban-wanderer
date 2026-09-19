// Headless evaluation of story personalization.
//
// Generates stories for one location under systematically varied preference
// settings, using the app's own pipeline (stores.js) and story generation
// (ai-story.js). Run `node scripts/story-personalization-eval.mjs --help`.

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const constants = await import(pathToFileURL(path.join(rootDir, 'src/constants/ui-config.js')));
const { AI_MODELS, FAMILIARITY, GUIDE_CHARACTERS, LABELS, LANGUAGES } = constants;

const ALL_LABELS = LABELS.map((label) => label.value);

// Preference keys that only influence the story prompt. Every other key may
// change the place context (fetching, grouping, analysis, rating, insights) and
// therefore requires its own pipeline run.
const STORY_ONLY_KEYS = new Set(['guideCharacter', 'familiarity', 'aiModelAdvanced']);
// Keys whose variation triggers new upstream AI calls (grouping, analysis, insights).
const UPSTREAM_AI_KEYS = ['lang', 'sourceLanguages', 'radius'];

const DEFAULT_VALUE_SETS = {
	guideCharacter: GUIDE_CHARACTERS,
	familiarity: FAMILIARITY.map((option) => option.value),
	lang: LANGUAGES.map((option) => option.value),
	labels: ['ALL', 'NONE', ...ALL_LABELS],
	aiModelAdvanced: AI_MODELS.ADVANCED.map((option) => option.value)
};

const HELP = `
Usage: node scripts/story-personalization-eval.mjs --lat <lat> --lon <lon> [options]

Generates stories headlessly for one location under varied personalization
settings, running the same pipeline and story code as the app.

Required:
  --lat <number>            Latitude of the position
  --lon <number>            Longitude of the position

Study design:
  --vary <keys>             Comma-separated preference keys to vary (full factorial).
                            Known keys with default value sets:
                              guideCharacter (${DEFAULT_VALUE_SETS.guideCharacter.length}), familiarity (${DEFAULT_VALUE_SETS.familiarity.length}), lang (${DEFAULT_VALUE_SETS.lang.length}),
                              labels (${DEFAULT_VALUE_SETS.labels.length}: ALL, NONE, each single label), aiModelAdvanced (${DEFAULT_VALUE_SETS.aiModelAdvanced.length})
                            Default: guideCharacter,familiarity
  --values <key=v1|v2|...>  Override the value set of a varied key (repeatable).
                            For labels, join labels with '+', or use ALL / NONE.
  --base <key=value>        Fix a preference for all configurations (repeatable),
                            e.g. --base lang=en --base labels=HISTORY+ARCHITECTURE
  --design <kind>           factorial: every combination of the varied values (default)
                            random: a balanced random sample of the combinations, each
                            level appearing equally often and level pairs spread evenly
                            (a near-orthogonal design for estimating main effects)
  --sample <n>              Number of configurations for --design random (default 40)
  --seed <n>                Seed of the random sample, for reproducibility (default 1)
  --retries <n>             Repetitions per configuration (default 3)
  --segments <n>            Story segments per repetition; segment k continues the
                            chain of segments 1..k-1 like "Tell me more" (default 1)

Execution:
  --concurrency <n>         Parallel story chains (default 4)
  --out <dir>               Output directory (default eval-results/stories/<timestamp>)
  --cache-dir <dir>         Persistent app cache (localStorage stand-in) shared across
                            runs (default .eval-cache)
  --context <file>          Reuse a contexts/context-*.json file from an earlier run for all
                            configurations instead of running the place pipeline. This holds
                            the place context fixed, so only the story prompt varies (labels
                            then no longer influence place rating and selection).
  --dry-run                 Only print the cost estimate
  --yes                     Skip the confirmation prompt
  --verbose                 Print the app's log output to the console instead of app.log
  --help                    Show this help

Output (in --out):
  run.json         Parameters, estimate, timing, token totals
  contexts/*.json  Place context (here/nearby/surrounding, address) per pipeline run
  results.jsonl    One line per generated segment (config, retry, segment, text, usage)
  stories.md       All stories, grouped by configuration, for reading
  app.log          The app's own log output (unless --verbose)
`;

function parseArgs(argv) {
	const args = {
		vary: ['guideCharacter', 'familiarity'],
		values: {},
		base: {},
		design: 'factorial',
		sample: 40,
		seed: 1,
		retries: 3,
		segments: 1,
		concurrency: 4,
		out: null,
		cacheDir: path.join(rootDir, '.eval-cache'),
		context: null,
		dryRun: false,
		yes: false,
		verbose: false
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => {
			const value = argv[++i];
			if (value === undefined) {
				throw new Error(`Missing value for ${arg}`);
			}
			return value;
		};
		switch (arg) {
			case '--help':
			case '-h':
				console.log(HELP);
				process.exit(0);
				break;
			case '--lat':
				args.lat = Number(next());
				break;
			case '--lon':
				args.lon = Number(next());
				break;
			case '--vary':
				args.vary = next()
					.split(',')
					.map((key) => key.trim())
					.filter(Boolean);
				break;
			case '--values': {
				const [key, rawValues] = splitKeyValue(next());
				args.values[key] = rawValues.split('|').map((value) => value.trim());
				break;
			}
			case '--base': {
				const [key, value] = splitKeyValue(next());
				args.base[key] = value;
				break;
			}
			case '--design':
				args.design = next();
				if (!['factorial', 'random'].includes(args.design)) {
					throw new Error('--design expects "factorial" or "random"');
				}
				break;
			case '--sample':
				args.sample = parsePositiveInt(next(), arg);
				break;
			case '--seed':
				args.seed = parsePositiveInt(next(), arg);
				break;
			case '--retries':
				args.retries = parsePositiveInt(next(), arg);
				break;
			case '--segments':
				args.segments = parsePositiveInt(next(), arg);
				break;
			case '--concurrency':
				args.concurrency = parsePositiveInt(next(), arg);
				break;
			case '--out':
				args.out = path.resolve(next());
				break;
			case '--cache-dir':
				args.cacheDir = path.resolve(next());
				break;
			case '--context':
				args.context = path.resolve(next());
				break;
			case '--dry-run':
				args.dryRun = true;
				break;
			case '--yes':
			case '-y':
				args.yes = true;
				break;
			case '--verbose':
				args.verbose = true;
				break;
			default:
				throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (!Number.isFinite(args.lat) || !Number.isFinite(args.lon)) {
		throw new Error('--lat and --lon are required (see --help)');
	}
	if (!args.out) {
		args.out = path.join(rootDir, 'eval-results', 'stories', timestampForPath());
	}
	return args;
}

function splitKeyValue(text) {
	const index = text.indexOf('=');
	if (index <= 0) {
		throw new Error(`Expected key=value, got "${text}"`);
	}
	return [text.slice(0, index).trim(), text.slice(index + 1)];
}

function parsePositiveInt(value, flag) {
	const number = Number(value);
	if (!Number.isInteger(number) || number < 1) {
		throw new Error(`${flag} expects a positive integer, got "${value}"`);
	}
	return number;
}

function timestampForPath() {
	return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

// Converts a CLI value into the preference representation used by the app.
function parsePreferenceValue(key, rawValue) {
	if (key === 'labels') {
		if (rawValue === 'ALL') return [...ALL_LABELS];
		if (rawValue === 'NONE') return [];
		const labels = rawValue.split('+').map((label) => label.trim().toUpperCase());
		const unknown = labels.filter((label) => !ALL_LABELS.includes(label));
		if (unknown.length) {
			throw new Error(`Unknown labels: ${unknown.join(', ')} (known: ${ALL_LABELS.join(', ')})`);
		}
		return labels;
	}
	if (key === 'sourceLanguages') {
		return rawValue.split('+').map((lang) => lang.trim());
	}
	if (key === 'radius') {
		return Number(rawValue);
	}
	if (rawValue === 'true' || rawValue === 'false') {
		return rawValue === 'true';
	}
	return rawValue;
}

function formatPreferenceValue(key, value) {
	if (key === 'labels') {
		if (value.length === ALL_LABELS.length) return 'ALL';
		if (value.length === 0) return 'NONE';
		return value.join('+');
	}
	if (Array.isArray(value)) return value.join('+');
	return String(value);
}

function buildConfigurations(args) {
	const variedValues = {};
	for (const key of args.vary) {
		const rawValues = args.values[key] || DEFAULT_VALUE_SETS[key];
		if (!rawValues) {
			throw new Error(`No default value set for "${key}"; provide one with --values ${key}=v1|v2`);
		}
		variedValues[key] = rawValues.map((rawValue) => parsePreferenceValue(key, rawValue));
	}
	for (const key of Object.keys(args.values)) {
		if (!args.vary.includes(key)) {
			throw new Error(`--values given for "${key}" but it is not listed in --vary`);
		}
	}
	const base = Object.fromEntries(
		Object.entries(args.base).map(([key, value]) => [key, parsePreferenceValue(key, value)])
	);

	const fullSize = args.vary.reduce((product, key) => product * variedValues[key].length, 1);
	let combinations;
	if (args.design === 'random' && args.sample < fullSize) {
		combinations = sampleBalancedDesign(args.vary, variedValues, args.sample, args.seed);
	} else {
		combinations = [{}];
		for (const key of args.vary) {
			combinations = combinations.flatMap((combination) =>
				variedValues[key].map((value) => ({ ...combination, [key]: value }))
			);
		}
	}
	const configs = combinations.map((varied, index) => ({
		id: index + 1,
		varied,
		overrides: { ...base, ...varied },
		label: Object.entries(varied)
			.map(([key, value]) => `${key}=${formatPreferenceValue(key, value)}`)
			.join(', ')
	}));
	return { variedValues, base, configs, fullSize };
}

// Deterministic PRNG (mulberry32) so a sample can be reproduced from its seed.
function createRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle(items, random) {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}

// Balanced random sample of the factor space: every level of every factor
// appears equally often (±1), then random swaps within columns spread the
// level pairs of all factor pairs as evenly as possible and remove duplicate
// rows. The result approximates an orthogonal array for main-effect estimation.
function sampleBalancedDesign(keys, variedValues, size, seed) {
	const random = createRandom(seed);
	const columns = keys.map((key) => {
		const levels = variedValues[key].length;
		const column = Array.from({ length: size }, (_, row) => row % levels);
		return shuffle(column, random);
	});

	const rowKey = (row) => columns.map((column) => column[row]).join('|');
	const score = () => {
		let imbalance = 0;
		for (let a = 0; a < columns.length; a++) {
			for (let b = a + 1; b < columns.length; b++) {
				const counts = new Map();
				for (let row = 0; row < size; row++) {
					const pair = `${columns[a][row]},${columns[b][row]}`;
					counts.set(pair, (counts.get(pair) || 0) + 1);
				}
				const cells = variedValues[keys[a]].length * variedValues[keys[b]].length;
				const expected = size / cells;
				let deviation = 0;
				for (const count of counts.values()) {
					deviation += (count - expected) ** 2;
				}
				deviation += (cells - counts.size) * expected ** 2;
				imbalance += deviation / cells;
			}
		}
		const seen = new Set();
		let duplicates = 0;
		for (let row = 0; row < size; row++) {
			const key = rowKey(row);
			if (seen.has(key)) duplicates++;
			seen.add(key);
		}
		return imbalance + duplicates * size;
	};

	let current = score();
	const iterations = Math.max(2000, size * 100);
	for (let iteration = 0; iteration < iterations && current > 0; iteration++) {
		const column = columns[Math.floor(random() * columns.length)];
		const rowA = Math.floor(random() * size);
		const rowB = Math.floor(random() * size);
		if (rowA === rowB || column[rowA] === column[rowB]) continue;
		[column[rowA], column[rowB]] = [column[rowB], column[rowA]];
		const candidate = score();
		if (candidate <= current) {
			current = candidate;
		} else {
			[column[rowA], column[rowB]] = [column[rowB], column[rowA]];
		}
	}

	const seen = new Set();
	const combinations = [];
	for (let row = 0; row < size; row++) {
		const key = rowKey(row);
		if (seen.has(key)) continue;
		seen.add(key);
		combinations.push(
			Object.fromEntries(
				keys.map((factor, index) => [factor, variedValues[factor][columns[index][row]]])
			)
		);
	}
	return combinations;
}

function describeDesignBalance(configs, keys, variedValues) {
	return keys.map((key) => {
		const counts = variedValues[key].map(
			(value) =>
				configs.filter((config) => JSON.stringify(config.varied[key]) === JSON.stringify(value))
					.length
		);
		return `${key} ${Math.min(...counts)}–${Math.max(...counts)}×`;
	});
}

function contextKeyOf(preferences) {
	const relevant = Object.fromEntries(
		Object.entries(preferences)
			.filter(([key]) => !STORY_ONLY_KEYS.has(key) && key !== 'audio' && key !== 'debug')
			.sort(([a], [b]) => a.localeCompare(b))
	);
	return JSON.stringify(relevant);
}

function upstreamKeyOf(preferences) {
	return JSON.stringify(UPSTREAM_AI_KEYS.map((key) => preferences[key]));
}

// File-backed stand-in for the browser's localStorage so the app's own caches
// (OSM, reverse geocoding, analysis, insights) work and persist across runs.
function installLocalStorage(cacheDir) {
	mkdirSync(cacheDir, { recursive: true });
	const file = path.join(cacheDir, 'localStorage.json');
	let data = {};
	if (existsSync(file)) {
		try {
			data = JSON.parse(readFileSync(file, 'utf8'));
		} catch {
			data = {};
		}
	}
	const persist = () => writeFileSync(file, JSON.stringify(data));
	globalThis.localStorage = {
		getItem: (key) => (Object.hasOwn(data, key) ? data[key] : null),
		setItem: (key, value) => {
			data[key] = String(value);
			persist();
		},
		removeItem: (key) => {
			delete data[key];
			persist();
		},
		clear: () => {
			data = {};
			persist();
		},
		key: (index) => Object.keys(data)[index] ?? null,
		get length() {
			return Object.keys(data).length;
		}
	};
	return file;
}

// Redirects the app's console logging to a file so the progress output stays readable.
function redirectAppLogs(logFile) {
	const write =
		(level) =>
		(message, ...details) => {
			const line = [new Date().toISOString(), level.toUpperCase(), message, ...details]
				.map((part) => (typeof part === 'string' ? part : safeStringify(part)))
				.join(' ');
			appendFileSync(logFile, `${line}\n`);
		};
	for (const level of ['debug', 'log', 'info', 'warn']) {
		console[level] = write(level);
	}
}

function safeStringify(value) {
	if (value instanceof Error) return value.stack || value.message;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

const out = (text = '') => process.stdout.write(`${text}\n`);

function displayPath(target) {
	const relative = path.relative(rootDir, target);
	return relative && !relative.startsWith('..') ? relative : target;
}

function printEstimate(args, plan) {
	const { configs, variedValues, base, contextCount, upstreamCount, fullSize } = plan;
	const storyRequests = configs.length * args.retries * args.segments;
	const sampled = args.design === 'random' && configs.length < fullSize;
	out('Story personalization evaluation');
	out(`  Location:      ${args.lat}, ${args.lon}`);
	out(
		`  Varied:        ${
			args.vary.map((key) => `${key} (${variedValues[key].length})`).join(', ') || 'nothing'
		}`
	);
	out(
		`  Fixed:         ${
			Object.entries(base)
				.map(([key, value]) => `${key}=${formatPreferenceValue(key, value)}`)
				.join(', ') || 'app defaults'
		}`
	);
	if (sampled) {
		out(
			`  Design:        balanced random sample of ${configs.length} of ${fullSize} combinations (seed ${args.seed});` +
				` levels appear ${describeDesignBalance(configs, args.vary, variedValues).join(', ')}`
		);
	} else {
		out(`  Design:        full factorial (${fullSize} combinations)`);
	}
	out(`  Configurations: ${configs.length}`);
	out(`  Retries:        ${args.retries} per configuration`);
	out(`  Segments:       ${args.segments} per story`);
	out('');
	out(
		`  Story requests: ${configs.length} × ${args.retries} × ${args.segments} = ${storyRequests}` +
			` (advanced model, reasoning effort "story")`
	);
	if (args.context) {
		out(`  Context pipelines: 0 (fixed context from ${displayPath(args.context)})`);
	} else {
		out(
			`  Context pipelines: ${contextCount} (place fetching, grouping, analysis, rating, insights)`
		);
		out(
			`    of which ${upstreamCount} need their own grouping/analysis/insight AI calls` +
				` (distinct ${UPSTREAM_AI_KEYS.join('/')}); the rest reuse the app cache`
		);
	}
	out(`  Concurrency:    ${args.concurrency} parallel story chains`);
	out(`  Output:         ${displayPath(args.out)}`);
	out('');
}

async function confirm(question) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await rl.question(question);
		return /^y(es)?$/i.test(answer.trim());
	} finally {
		rl.close();
	}
}

async function runPool(tasks, concurrency) {
	const results = new Array(tasks.length);
	let nextIndex = 0;
	const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
		while (nextIndex < tasks.length) {
			const index = nextIndex++;
			results[index] = await tasks[index]();
		}
	});
	await Promise.all(workers);
	return results;
}

function snapshot(value) {
	try {
		return structuredClone(value);
	} catch {
		return JSON.parse(JSON.stringify(value));
	}
}

function gitCommit() {
	try {
		return execSync('git rev-parse --short HEAD', {
			cwd: rootDir,
			stdio: ['ignore', 'pipe', 'ignore']
		})
			.toString()
			.trim();
	} catch {
		return null;
	}
}

function sumUsage(total, usage) {
	if (!usage) return total;
	return {
		inputTokens: total.inputTokens + (usage.input_tokens || 0),
		outputTokens: total.outputTokens + (usage.output_tokens || 0),
		reasoningTokens: total.reasoningTokens + (usage.output_tokens_details?.reasoning_tokens || 0),
		cachedInputTokens: total.cachedInputTokens + (usage.input_tokens_details?.cached_tokens || 0)
	};
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const { variedValues, base, configs, fullSize } = buildConfigurations(args);

	// The context grouping only depends on the overrides, so it can be estimated
	// before loading the app (which requires the OpenAI key file).
	const contextKeys = new Set(configs.map((config) => contextKeyOf(config.overrides)));
	const upstreamKeys = new Set(configs.map((config) => upstreamKeyOf(config.overrides)));
	const plan = {
		configs,
		variedValues,
		base,
		contextCount: contextKeys.size,
		upstreamCount: upstreamKeys.size,
		fullSize
	};
	printEstimate(args, plan);

	if (args.dryRun) {
		out('Configurations:');
		for (const config of configs) {
			out(`  ${String(config.id).padStart(3)}: ${config.label || 'defaults'}`);
		}
		out('Dry run, nothing generated.');
		return;
	}
	if (!args.yes && !(await confirm('Proceed with generation? [y/N] '))) {
		out('Aborted.');
		return;
	}

	mkdirSync(path.join(args.out, 'contexts'), { recursive: true });
	const cacheFile = installLocalStorage(args.cacheDir);
	if (!args.verbose) {
		redirectAppLogs(path.join(args.out, 'app.log'));
	}

	const keyFile = path.join(rootDir, 'src/.openai_api_key.js');
	if (!existsSync(keyFile)) {
		throw new Error(`OpenAI key file missing: ${path.relative(rootDir, keyFile)} (see README)`);
	}
	const stores = await import(pathToFileURL(path.join(rootDir, 'src/stores.js')));
	const { generateStory } = await import(pathToFileURL(path.join(rootDir, 'src/util/ai-story.js')));
	const { get } = await import('svelte/store');

	const startedAt = Date.now();
	const runMeta = {
		startedAt: new Date(startedAt).toISOString(),
		gitCommit: gitCommit(),
		args: {
			...args,
			out: displayPath(args.out),
			context: args.context && displayPath(args.context)
		},
		configs: configs.map(({ id, label, overrides }) => ({ id, label, overrides })),
		design: {
			kind: args.design === 'random' && configs.length < fullSize ? 'random' : 'factorial',
			fullSize,
			seed: args.seed
		},
		estimate: {
			configurations: configs.length,
			storyRequests: configs.length * args.retries * args.segments,
			contextPipelines: contextKeys.size,
			upstreamAiPipelines: upstreamKeys.size
		},
		cacheFile: path.relative(rootDir, cacheFile)
	};
	writeFileSync(path.join(args.out, 'run.json'), JSON.stringify(runMeta, null, 2));

	// Stage 1: build the place context per distinct pipeline-relevant preference set.
	// The stores are module singletons, so this stage is sequential.
	const contexts = new Map();
	const defaultPreferences = get(stores.preferences);
	let fixedContext = null;
	if (args.context) {
		fixedContext = { ...JSON.parse(readFileSync(args.context, 'utf8')), id: 1 };
		contexts.set('fixed', fixedContext);
		writeFileSync(
			path.join(args.out, 'contexts', 'context-1.json'),
			JSON.stringify(fixedContext, null, 2)
		);
		out(
			`Using fixed context from ${displayPath(args.context)}: here=${fixedContext.placesHere.length}` +
				` nearby=${fixedContext.placesNearby.length} surrounding=${fixedContext.placesSurrounding.length}`
		);
	} else {
		out(`Building ${contextKeys.size} place context(s) ...`);
	}
	let contextIndex = 0;
	for (const config of configs) {
		const prefs = { ...defaultPreferences, ...config.overrides, audio: false };
		const contextKey = contextKeyOf(prefs);
		config.preferences = prefs;
		config.contextId = null;
		if (fixedContext) {
			config.contextId = fixedContext.id;
			continue;
		}
		if (contexts.has(contextKey)) {
			config.contextId = contexts.get(contextKey).id;
			continue;
		}
		const contextId = ++contextIndex;
		const contextStartedAt = Date.now();
		stores.preferences.set(prefs);
		stores.errorMessage.set(null);
		await stores.updateLocation({ latitude: args.lat, longitude: args.lon }, { background: false });
		const pipelineError = get(stores.errorMessage);
		if (pipelineError) {
			throw new Error(`Place pipeline failed: ${pipelineError}`);
		}
		await stores.loadMetadata({ loadImages: false });
		const context = {
			id: contextId,
			key: contextKey,
			preferences: Object.fromEntries(
				Object.entries(prefs).filter(([key]) => !STORY_ONLY_KEYS.has(key))
			),
			coordinates: snapshot(get(stores.coordinates)),
			placesHere: snapshot(get(stores.placesHere)),
			placesNearby: snapshot(get(stores.placesNearby)),
			placesSurrounding: snapshot(get(stores.placesSurrounding)),
			durationMs: Date.now() - contextStartedAt
		};
		contexts.set(contextKey, context);
		config.contextId = contextId;
		writeFileSync(
			path.join(args.out, 'contexts', `context-${contextId}.json`),
			JSON.stringify(context, null, 2)
		);
		out(
			`  context ${contextId}: here=${context.placesHere.length}` +
				` nearby=${context.placesNearby.length} surrounding=${context.placesSurrounding.length}` +
				` (${(context.durationMs / 1000).toFixed(1)}s) @ ${context.coordinates.address}`
		);
		out(`    here: ${context.placesHere.map((place) => place.title).join('; ') || '-'}`);
	}
	const contextById = new Map([...contexts.values()].map((context) => [context.id, context]));

	// Stage 2: generate stories in parallel. Each (config, retry) is a chain of
	// segments, continued exactly like "Tell me more" in the app.
	const totalRequests = configs.length * args.retries * args.segments;
	const resultsFile = path.join(args.out, 'results.jsonl');
	writeFileSync(resultsFile, '');
	const records = [];
	const failures = [];
	let completed = 0;
	let usageTotal = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedInputTokens: 0 };
	out(`Generating ${totalRequests} story segment(s) with concurrency ${args.concurrency} ...`);

	const tasks = configs.flatMap((config) =>
		Array.from({ length: args.retries }, (_, retryIndex) => async () => {
			const context = contextById.get(config.contextId);
			const storyTexts = [];
			let lastResponseId = null;
			for (let segment = 1; segment <= args.segments; segment++) {
				const record = {
					configId: config.id,
					configLabel: config.label,
					contextId: context.id,
					retry: retryIndex + 1,
					segment,
					varied: config.varied,
					preferences: config.preferences
				};
				const segmentStartedAt = Date.now();
				try {
					const result = await generateStory(
						[...storyTexts],
						context.placesHere,
						context.placesNearby,
						context.placesSurrounding,
						context.coordinates,
						config.preferences,
						lastResponseId
					);
					record.text = result.text;
					record.responseId = result.responseId;
					record.usage = result.usage || null;
					record.characters = result.text.length;
					storyTexts.push(result.text);
					lastResponseId = result.responseId;
					usageTotal = sumUsage(usageTotal, result.usage);
				} catch (error) {
					record.error = error?.message || String(error);
					failures.push(record);
				}
				record.durationMs = Date.now() - segmentStartedAt;
				records.push(record);
				appendFileSync(resultsFile, `${JSON.stringify(record)}\n`);
				completed++;
				const status = record.error ? `FAILED: ${record.error}` : `${record.characters} chars`;
				out(
					`  [${String(completed).padStart(String(totalRequests).length)}/${totalRequests}]` +
						` config ${config.id} (${config.label}) retry ${record.retry} segment ${segment}:` +
						` ${status}, ${(record.durationMs / 1000).toFixed(1)}s`
				);
				if (record.error) {
					break;
				}
			}
		})
	);
	await runPool(tasks, args.concurrency);

	writeFileSync(path.join(args.out, 'stories.md'), renderStoriesMarkdown(args, configs, records));
	const finishedAt = Date.now();
	runMeta.finishedAt = new Date(finishedAt).toISOString();
	runMeta.durationMs = finishedAt - startedAt;
	runMeta.completedRequests = records.length - failures.length;
	runMeta.failedRequests = failures.length;
	runMeta.usage = usageTotal;
	runMeta.contexts = [...contexts.values()].map((context) => ({
		id: context.id,
		preferences: context.preferences,
		address: context.coordinates.address,
		here: context.placesHere.map((place) => place.title),
		nearby: context.placesNearby.map((place) => place.title),
		surrounding: context.placesSurrounding.map((place) => place.title),
		durationMs: context.durationMs
	}));
	writeFileSync(path.join(args.out, 'run.json'), JSON.stringify(runMeta, null, 2));

	out('');
	out(`Done in ${((finishedAt - startedAt) / 1000).toFixed(1)}s.`);
	out(`  Segments generated: ${runMeta.completedRequests}, failed: ${failures.length}`);
	out(
		`  Tokens: input ${usageTotal.inputTokens} (cached ${usageTotal.cachedInputTokens}),` +
			` output ${usageTotal.outputTokens} (reasoning ${usageTotal.reasoningTokens})`
	);
	out(`  Results: ${displayPath(args.out)}`);
	if (failures.length) {
		process.exitCode = 1;
	}
}

function renderStoriesMarkdown(args, configs, records) {
	const lines = [
		'# Story personalization evaluation',
		'',
		`Location: ${args.lat}, ${args.lon}  `,
		`Varied: ${args.vary.join(', ')}  `,
		`Retries: ${args.retries}, segments: ${args.segments}`,
		''
	];
	for (const config of configs) {
		lines.push(`## Configuration ${config.id}: ${config.label || 'defaults'}`, '');
		lines.push(
			`Context ${config.contextId}; preferences: ` +
				Object.entries(config.overrides)
					.map(([key, value]) => `${key}=${formatPreferenceValue(key, value)}`)
					.join(', '),
			''
		);
		const configRecords = records
			.filter((record) => record.configId === config.id)
			.sort((a, b) => a.retry - b.retry || a.segment - b.segment);
		for (const record of configRecords) {
			lines.push(`### Retry ${record.retry}, segment ${record.segment}`, '');
			lines.push(record.error ? `_Failed: ${record.error}_` : record.text, '');
		}
	}
	return lines.join('\n');
}

main().catch((error) => {
	process.stderr.write(`${error.stack || error.message || error}\n`);
	process.exit(1);
});
