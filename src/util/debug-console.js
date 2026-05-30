import { writable } from 'svelte/store';

const MAX_LOGS = 300;
const MAX_LOG_MESSAGE_LENGTH = 600;
const METHODS = ['debug', 'log', 'info', 'warn', 'error'];
const originalConsole = {};

let initialized = false;
let enabled = false;
let nextLogId = 1;

export const debugLogs = writable([]);

function truncate(value) {
	if (value.length <= MAX_LOG_MESSAGE_LENGTH) {
		return value;
	}
	return `${value.slice(0, MAX_LOG_MESSAGE_LENGTH)}... [truncated]`;
}

function stringify(value) {
	if (value instanceof Error) {
		return value.stack || value.message;
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'undefined') {
		return 'undefined';
	}
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function addLog(level, args) {
	if (!enabled) {
		return;
	}

	debugLogs.update((logs) =>
		[
			...logs,
			{
				id: nextLogId++,
				level,
				timestamp: new Date().toISOString().slice(11, 19),
				message: truncate(args.map((arg) => stringify(arg)).join(' '))
			}
		].slice(-MAX_LOGS)
	);
}

export function initializeDebugConsole() {
	if (initialized || typeof console === 'undefined') {
		return;
	}

	for (const method of METHODS) {
		originalConsole[method] = console[method]?.bind(console) || (() => {});
		console[method] = (...args) => {
			addLog(method, args);
			originalConsole[method](...args);
		};
	}

	initialized = true;
}

export function setDebugConsoleEnabled(value) {
	initializeDebugConsole();
	enabled = Boolean(value);

	if (enabled) {
		addLog('debug', ['Debug console enabled']);
	}
}

export function clearDebugConsole() {
	debugLogs.set([]);
}
