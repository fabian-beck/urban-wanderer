import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const INDEX_FILE = 'index.json';
const RESPONSES_DIR = 'responses';
// Not replayed: they describe the original transfer, not the (decoded) body that is stored
const DROPPED_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding']);

const hash = (data) => createHash('sha1').update(data).digest('hex');
const tokenize = (text) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
const similarity = (a, b) => {
	let shared = 0;
	for (const token of a) {
		if (b.has(token)) {
			shared += 1;
		}
	}
	return shared / (a.size + b.size - shared || 1);
};

// Records the responses to all external requests of a browser context and replays them in later
// runs, so the app shows exactly the same places, ratings, and generated texts. Requests match by
// method, URL, and body; a request whose body differs (e.g., by a time in a prompt) falls back to
// the most similar recorded request to the same URL that was not replayed yet, if at least
// `minSimilarity` of their body tokens agree. Unmatched requests are made by the browser itself
// (requests from Node would be throttled by Wikimedia) and their successful responses are added to
// the recording. Replayed responses keep their recorded latency, so waits look as recorded.
// `onResponse` receives every successful external response ({ url, contentType, body }).
export async function attachReplay(
	context,
	{ dir, record = false, isLocal, minSimilarity, onResponse = () => {} }
) {
	if (record) {
		rmSync(dir, { recursive: true, force: true });
	}
	mkdirSync(path.join(dir, RESPONSES_DIR), { recursive: true });
	const indexPath = path.join(dir, INDEX_FILE);
	const entries = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')).entries : [];
	const replayed = new Set();
	const tokenCache = new Map();
	// Requests that went to the network, with the time they started
	const live = new Map();
	const pending = new Set();
	const stats = { replayed: 0, similar: 0, recorded: 0 };
	let changed = false;

	const findEntry = (method, url, bodyHash, bodyText) => {
		const sameUrl = entries.filter((entry) => entry.method === method && entry.url === url);
		const exact = sameUrl.filter((entry) => entry.bodyHash === bodyHash);
		const fresh = exact.find((entry) => !replayed.has(entry));
		if (fresh || exact.length) {
			stats.replayed += 1;
			return fresh || exact[exact.length - 1];
		}
		if (!bodyText) {
			return null;
		}
		const tokens = tokenize(bodyText);
		let best = null;
		let bestScore = minSimilarity;
		for (const entry of sameUrl) {
			if (replayed.has(entry) || entry.requestBody === undefined) {
				continue;
			}
			if (!tokenCache.has(entry)) {
				tokenCache.set(entry, tokenize(entry.requestBody));
			}
			const score = similarity(tokens, tokenCache.get(entry));
			if (score >= bestScore) {
				best = entry;
				bestScore = score;
			}
		}
		if (best) {
			stats.similar += 1;
			console.log(`    replay: similar request (${bestScore.toFixed(2)}) for ${url}`);
		}
		return best;
	};

	// Stores the final response of a request that went to the network (after redirects) under the
	// original request
	const recordResponse = async (request) => {
		let original = request;
		while (original.redirectedFrom()) {
			original = original.redirectedFrom();
		}
		const startedAt = live.get(original);
		live.delete(original);
		const response = await request.response();
		if (!response || response.status() < 200 || response.status() >= 300) {
			return;
		}
		const body = await response.body();
		const responseFile = hash(body);
		writeFileSync(path.join(dir, RESPONSES_DIR, responseFile), body);
		const requestBody = original.postDataBuffer();
		const entry = {
			method: original.method(),
			url: original.url(),
			bodyHash: requestBody ? hash(requestBody) : '',
			...(requestBody && { requestBody: requestBody.toString('utf8') }),
			status: response.status(),
			headers: Object.fromEntries(
				Object.entries(response.headers()).filter(([name]) => !DROPPED_HEADERS.has(name))
			),
			responseFile,
			durationMs: Date.now() - startedAt
		};
		entries.push(entry);
		replayed.add(entry);
		stats.recorded += 1;
		changed = true;
		if (!record) {
			console.log(`    replay: recorded new ${entry.method} ${entry.url.slice(0, 100)}`);
		}
		onResponse({ url: entry.url, contentType: entry.headers['content-type'] || '', body });
	};

	context.on('requestfinished', (request) => {
		let original = request;
		while (original.redirectedFrom()) {
			original = original.redirectedFrom();
		}
		if (request.redirectedTo() || !live.has(original)) {
			return;
		}
		const task = recordResponse(request)
			.catch((error) => console.log(`    replay: not recorded ${request.url()}: ${error.message}`))
			.finally(() => pending.delete(task));
		pending.add(task);
	});
	context.on('requestfailed', (request) => live.delete(request));

	await context.route('**/*', async (route) => {
		const request = route.request();
		const url = request.url();
		if (isLocal(url)) {
			await route.fallback();
			return;
		}
		const body = request.postDataBuffer();
		const entry = findEntry(request.method(), url, body ? hash(body) : '', body?.toString('utf8'));
		if (!entry) {
			live.set(request, Date.now());
			await route.continue();
			return;
		}
		replayed.add(entry);
		const responseBody = readFileSync(path.join(dir, RESPONSES_DIR, entry.responseFile));
		await new Promise((resolve) => setTimeout(resolve, entry.durationMs));
		onResponse({ url, contentType: entry.headers['content-type'] || '', body: responseBody });
		await route.fulfill({ status: entry.status, headers: entry.headers, body: responseBody });
	});

	return {
		stats,
		async save() {
			await Promise.all(pending);
			if (changed) {
				writeFileSync(indexPath, JSON.stringify({ version: 1, entries }));
			}
		}
	};
}
