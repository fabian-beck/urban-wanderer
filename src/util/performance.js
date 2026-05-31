import { createLogger } from './logger.js';

const logger = createLogger('perf');

function now() {
	if (typeof performance !== 'undefined' && performance.now) {
		return performance.now();
	}
	return Date.now();
}

function hasDetails(details) {
	return details && typeof details === 'object' && Object.keys(details).length > 0;
}

function log(level, message, details) {
	if (hasDetails(details)) {
		logger[level](message, details);
	} else {
		logger[level](message);
	}
}

export function formatDuration(durationMs) {
	if (durationMs < 1000) {
		return `${durationMs.toFixed(0)}ms`;
	}
	return `${(durationMs / 1000).toFixed(2)}s`;
}

export function createPerformanceRun(label, details = {}) {
	const startedAt = now();
	let previousAt = startedAt;
	const steps = [];

	log('info', `${label} started`, details);

	return {
		checkpoint(step, stepDetails = {}) {
			const checkedAt = now();
			const durationMs = checkedAt - previousAt;
			const totalMs = checkedAt - startedAt;
			const entry = {
				step,
				duration: formatDuration(durationMs),
				total: formatDuration(totalMs),
				...stepDetails
			};

			steps.push(entry);
			previousAt = checkedAt;
			log('info', `${label}: ${step} +${entry.duration} (${entry.total} total)`, stepDetails);
		},
		end(endDetails = {}) {
			const totalMs = now() - startedAt;
			log('info', `${label} finished in ${formatDuration(totalMs)}`, {
				...endDetails,
				steps
			});
		},
		fail(error) {
			const totalMs = now() - startedAt;
			logger.warn(`${label} failed after ${formatDuration(totalMs)}`, error);
		}
	};
}

export async function withPerformance(label, callback, details = {}) {
	const startedAt = now();
	log('debug', `${label} started`, details);

	try {
		const result = await callback();
		const durationMs = now() - startedAt;
		log('debug', `${label} finished in ${formatDuration(durationMs)}`, details);
		return result;
	} catch (error) {
		const durationMs = now() - startedAt;
		logger.warn(`${label} failed after ${formatDuration(durationMs)}`, error);
		throw error;
	}
}

export function logPerformance(label, durationMs, details = {}) {
	log('debug', `${label} ${formatDuration(durationMs)}`, details);
}

export function logPerformanceSummary(label, details = {}) {
	const fields = Object.entries(details)
		.map(([key, value]) => {
			if (typeof value === 'number') {
				return `${key}=${Number.isInteger(value) ? value : value.toFixed(2)}`;
			}
			if (Array.isArray(value)) {
				return `${key}=${value.join(',')}`;
			}
			if (value && typeof value === 'object') {
				return `${key}=${JSON.stringify(value)}`;
			}
			return `${key}=${value}`;
		})
		.join(' ');
	logger.info(`${label} ${fields}`);
}

export function getPerformanceNow() {
	return now();
}
