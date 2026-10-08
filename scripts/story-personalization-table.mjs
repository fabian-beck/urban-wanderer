// LaTeX table of a judged story personalization run: one row per factor level
// with TikZ box plots of the judged scores and the interest focus gain.
// Run `node scripts/story-personalization-table.mjs --help`.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const { AI_MODELS, FAMILIARITY, GUIDE_CHARACTERS, LABELS, LANGUAGES } = await import(
	pathToFileURL(path.join(rootDir, 'src/constants/ui-config.js'))
);

const ALL_LABELS = LABELS.map((label) => label.value);
const SCALE_MIN = 1;
const SCALE_MAX = 5;
const DIMENSIONS = [
	{ key: 'difficulty', name: 'Difficulty' },
	{ key: 'formality', name: 'Formality' },
	{ key: 'depth', name: 'Depth' },
	{ key: 'breadth', name: 'Breadth' },
	{ key: 'priorKnowledge', name: 'Prior knowledge', header: 'Prior\\\\knowledge' }
];
const FACTOR_NAMES = {
	guideCharacter: 'Guide character',
	familiarity: 'Familiarity',
	labels: 'Interests',
	lang: 'Language',
	aiModelAdvanced: 'Story model',
	location: 'Location'
};
// Diverging cell tint (blue below, red above the mean of all texts); the tint
// reaches MAX_TINT percent at a deviation of SCORE_SATURATION scale points
// (GAIN_SATURATION for the focus gain).
const DEVIATION_COLORS = { low: '2A78D6', high: 'E34948' };
const MAX_TINT = 45;
const SCORE_SATURATION = 1;
const GAIN_SATURATION = 0.2;
// Levels are listed in the order of the app settings; other levels follow in
// order of appearance.
const LEVEL_ORDER = {
	guideCharacter: GUIDE_CHARACTERS.map((character) => character.value),
	familiarity: FAMILIARITY.map((option) => option.value),
	labels: ['all', 'single', 'none'],
	lang: LANGUAGES.map((option) => option.value),
	aiModelAdvanced: AI_MODELS.ADVANCED.map((option) => option.value)
};
const LEVEL_NAMES = {
	lang: { en: 'English', de: 'German' },
	familiarity: { somewhat_familiar: 'somewhat familiar' }
};

const HELP = `
Usage: node scripts/story-personalization-table.mjs [--run <dir>] [options]

Writes a LaTeX table (tabularray + TikZ) with one row per level of every varied
factor: number of texts, box plots of the judged scores (1–5) with their mean,
and the interest focus gain: for texts with one preferred interest, the judged
probability that the text focuses on it minus the mean probability for that
interest in texts at the same location that do not prefer it.

Options:
  --run <dir>            Judged run directory (default: newest with judgments.jsonl)
  --out <file>           Output file (default <run>/table.tex)
  --rename <key=label>   Display name of a level, e.g. --rename erba="ERBA island" (repeatable)
  --help                 Show this help
`;

function parseArgs(argv) {
	const args = { run: null, out: null, rename: {} };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => {
			const value = argv[++i];
			if (value === undefined) throw new Error(`Missing value for ${arg}`);
			return value;
		};
		switch (arg) {
			case '--help':
			case '-h':
				console.log(HELP);
				process.exit(0);
				break;
			case '--run':
				args.run = path.resolve(next());
				break;
			case '--out':
				args.out = path.resolve(next());
				break;
			case '--rename': {
				const text = next();
				const index = text.indexOf('=');
				if (index <= 0) throw new Error(`--rename expects key=label, got "${text}"`);
				args.rename[text.slice(0, index)] = text.slice(index + 1);
				break;
			}
			default:
				throw new Error(`Unknown argument: ${arg}`);
		}
	}
	args.run ??= findNewestJudgedRun();
	args.out ??= path.join(args.run, 'table.tex');
	return args;
}

function findNewestJudgedRun() {
	const runsDir = path.join(rootDir, 'eval-results', 'stories');
	const runs = existsSync(runsDir)
		? readdirSync(runsDir)
				.filter((name) => existsSync(path.join(runsDir, name, 'judgments.jsonl')))
				.sort()
		: [];
	if (!runs.length) throw new Error('No judged run found; pass --run <dir>');
	return path.join(runsDir, runs[runs.length - 1]);
}

// Single interests are pooled into one level, since each alone covers few texts.
function levelOf(factor, value) {
	if (factor === 'labels') {
		if (value.length === ALL_LABELS.length) return 'all';
		if (value.length === 0) return 'none';
		return value.length === 1 ? 'single' : value.join('+');
	}
	return String(value);
}

function displayLevel(factor, level, rename) {
	if (rename[level]) return rename[level];
	if (factor === 'labels') return { all: 'all', none: 'none', single: 'one' }[level] ?? level;
	if (factor === 'aiModelAdvanced') return `\\texttt{${level}}`;
	return LEVEL_NAMES[factor]?.[level] ?? level.replace(/\s*\(.*\)$/, '');
}

function quantile(sorted, q) {
	const position = (sorted.length - 1) * q;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function summarize(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return {
		min: sorted[0],
		q1: quantile(sorted, 0.25),
		median: quantile(sorted, 0.5),
		q3: quantile(sorted, 0.75),
		max: sorted[sorted.length - 1],
		mean: values.reduce((sum, value) => sum + value, 0) / values.length
	};
}

// Interest focus gain per text with exactly one preferred interest: its
// probability of focusing on that interest minus the baseline, the mean
// probability for the same interest in texts at the same location that do not
// prefer it. Without the baseline, places that suggest a topic anyway (e.g.,
// history in an old town) would look like successful personalization.
function computeFocusGains(rows) {
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

function mean(values) {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const fixed = (value, digits = 1) => value.toFixed(digits);

// Diverging cell tint for the deviation of a level's mean from the mean of all
// texts: blue below, red above, white at zero, saturating at `saturation`.
function deviationTint(value, reference, saturation) {
	const deviation = value - reference;
	const strength = Math.round(Math.min(Math.abs(deviation) / saturation, 1) * MAX_TINT);
	return strength ? `${deviation < 0 ? 'devlow' : 'devhigh'}!${strength}!white` : 'white';
}

function boxPlot(stats, reference) {
	const tint = deviationTint(stats.mean, reference, SCORE_SATURATION);
	return `\\scorebox{${fixed(stats.min, 2)}}{${fixed(stats.q1, 2)}}{${fixed(stats.median, 2)}}{${fixed(stats.q3, 2)}}{${fixed(stats.max, 2)}}{${fixed(stats.mean, 1)}}{${tint}}`;
}

function meanGain(rows, gains) {
	const values = rows.filter((row) => gains.has(row)).map((row) => gains.get(row));
	return values.length ? mean(values) : null;
}

function gainBar(gain, reference) {
	if (gain === null) return '';
	const sign = gain >= 0 ? '+' : '\\textminus';
	const tint = deviationTint(gain, reference, GAIN_SATURATION);
	return `\\gainbar{${fixed(gain, 2)}}{${sign}${fixed(Math.abs(gain), 2)}}{${tint}}`;
}

function renderTable(runMeta, rows, rename) {
	const factors = runMeta.factors || runMeta.args?.vary || [];
	// Judgments made before a dimension was added lack it
	const dimensions = DIMENSIONS.filter((dimension) =>
		rows.every((row) => dimension.key in row.judgment)
	);
	const gains = computeFocusGains(rows);
	const overallMeans = Object.fromEntries(
		dimensions.map((dimension) => [
			dimension.key,
			mean(rows.map((row) => row.judgment[dimension.key]))
		])
	);
	const overallGain = meanGain(rows, gains);
	const body = [];
	for (const factor of factors) {
		const levels = [];
		for (const row of rows) {
			const level = levelOf(factor, row.varied[factor]);
			if (!levels.includes(level)) levels.push(level);
		}
		const order = LEVEL_ORDER[factor];
		if (order) {
			const rank = (level) => (order.includes(level) ? order.indexOf(level) : order.length);
			levels.sort((a, b) => rank(a) - rank(b));
		}
		levels.forEach((level, index) => {
			const group = rows.filter((row) => levelOf(factor, row.varied[factor]) === level);
			const cells = [
				index === 0 ? FACTOR_NAMES[factor] || factor : '',
				displayLevel(factor, level, rename),
				String(group.length),
				...dimensions.map((dimension) =>
					boxPlot(
						summarize(group.map((row) => row.judgment[dimension.key])),
						overallMeans[dimension.key]
					)
				),
				gainBar(meanGain(group, gains), overallGain)
			];
			body.push(`${cells.join(' & ')} \\\\`);
		});
		body.push('\\midrule');
	}
	body.pop();

	const all = rows;
	const overall = [
		'All texts',
		'',
		String(all.length),
		...dimensions.map((dimension) =>
			boxPlot(summarize(all.map((row) => row.judgment[dimension.key])), overallMeans[dimension.key])
		),
		gainBar(overallGain, overallGain)
	];

	return `% Generated by scripts/story-personalization-table.mjs from ${path.basename(path.dirname(runMeta.__file))}
% Requires tikz and tabularray (with the booktabs library).
\\definecolor{devlow}{HTML}{${DEVIATION_COLORS.low}}
\\definecolor{devhigh}{HTML}{${DEVIATION_COLORS.high}}
\\providecommand{\\scorebox}{}
\\renewcommand{\\scorebox}[7]{%
  \\tikz[baseline=-0.55ex, x=0.23cm, y=1ex]{%
    \\draw[black!15, fill=#7] (0,-0.9) rectangle (${SCALE_MAX - SCALE_MIN},0.9);
    \\draw[black!25] (${(SCALE_MAX - SCALE_MIN) / 2},-0.9) -- (${(SCALE_MAX - SCALE_MIN) / 2},0.9);
    \\draw[black!60] (#1-${SCALE_MIN},0) -- (#2-${SCALE_MIN},0) (#4-${SCALE_MIN},0) -- (#5-${SCALE_MIN},0);
    \\draw[black!60, fill=white] (#2-${SCALE_MIN},-0.6) rectangle (#4-${SCALE_MIN},0.6);
    \\draw[black, line width=0.9pt] (#3-${SCALE_MIN},-0.6) -- (#3-${SCALE_MIN},0.6);
  }~{\\scriptsize #6}}
\\providecommand{\\gainbar}{}
\\renewcommand{\\gainbar}[3]{%
  \\tikz[baseline=-0.55ex, x=0.45cm, y=1ex]{%
    \\draw[black!15, fill=#3] (-1,-0.9) rectangle (1,0.9);
    \\fill[black!45] (0,-0.6) rectangle (#1,0.6);
    \\draw[black!60] (0,-0.9) -- (0,0.9);
  }~{\\scriptsize #2}}
\\begin{tblr}{
    colspec={l l r *{${dimensions.length}}{c} c},
    column{1}={font=\\itshape},
    rowsep=0.6pt,
    colsep=2pt,
    cells={font=\\footnotesize},
  }
  \\toprule
  \\textbf{Factor} & \\textbf{Level} & $n$ & ${dimensions.map((dimension) => `{\\bfseries ${dimension.header ?? dimension.name}}`).join(' & ')} & \\textbf{Focus gain} \\\\
  \\midrule
  ${overall.join(' & ')} \\\\
  \\midrule
  ${body.join('\n  ')}
  \\bottomrule
\\end{tblr}
`;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const runFile = path.join(args.run, 'run.json');
	const runMeta = { ...JSON.parse(readFileSync(runFile, 'utf8')), __file: runFile };
	const rows = readFileSync(path.join(args.run, 'judgments.jsonl'), 'utf8')
		.split('\n')
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line))
		.filter((row) => row.judgment);
	if (!rows.length) throw new Error(`No judgments in ${args.run}`);
	writeFileSync(args.out, renderTable(runMeta, rows, args.rename));
	console.log(
		`Table with ${rows.length} judged texts written to ${path.relative(rootDir, args.out)}`
	);
}

main();
