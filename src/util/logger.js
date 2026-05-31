import { DEBUG_LOG_LEVEL, DEFAULT_LOG_LEVEL, LOG_LEVELS } from '../constants/logging.js';

let currentLogLevel = DEFAULT_LOG_LEVEL;

function hasDetails(details) {
	return typeof details !== 'undefined';
}

function shouldLog(level) {
	return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

function log(scope, level, message, details) {
	if (!shouldLog(level) || typeof console === 'undefined') {
		return;
	}

	const method = (console[level] || console.log).bind(console);
	const prefix = `[${scope}] ${message}`;
	if (hasDetails(details)) {
		method(prefix, details);
	} else {
		method(prefix);
	}
}

export function setDebugLoggingEnabled(enabled) {
	currentLogLevel = enabled ? DEBUG_LOG_LEVEL : DEFAULT_LOG_LEVEL;
}

export function createLogger(scope) {
	return {
		debug: (message, details) => log(scope, 'debug', message, details),
		info: (message, details) => log(scope, 'info', message, details),
		warn: (message, details) => log(scope, 'warn', message, details),
		error: (message, details) => log(scope, 'error', message, details)
	};
}
