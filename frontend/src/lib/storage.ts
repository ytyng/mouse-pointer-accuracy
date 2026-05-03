import type { TestResult } from './types';

const KEY = 'mpa.results.v1';

function isValidClick(c: unknown): boolean {
	if (!c || typeof c !== 'object') return false;
	const o = c as Record<string, unknown>;
	return (
		typeof o.targetId === 'number' &&
		typeof o.clickedX === 'number' &&
		typeof o.clickedY === 'number' &&
		typeof o.expectedX === 'number' &&
		typeof o.expectedY === 'number' &&
		typeof o.hit === 'boolean' &&
		typeof o.tSinceStart === 'number' &&
		typeof o.tSincePrev === 'number'
	);
}

function isValidResult(r: unknown): r is TestResult {
	if (!r || typeof r !== 'object') return false;
	const o = r as Record<string, unknown>;
	if (
		typeof o.id !== 'string' ||
		typeof o.patternId !== 'string' ||
		typeof o.createdAt !== 'string' ||
		typeof o.totalMs !== 'number' ||
		typeof o.totalClicks !== 'number' ||
		typeof o.hitClicks !== 'number' ||
		typeof o.missClicks !== 'number' ||
		typeof o.missRate !== 'number' ||
		typeof o.avgIntervalMs !== 'number' ||
		!Array.isArray(o.clicks)
	) {
		return false;
	}
	// clicks の各要素も型を検証 (export 時の .toFixed() で throw しないため)
	return o.clicks.every(isValidClick);
}

function read(): TestResult[] {
	if (typeof localStorage === 'undefined') return [];
	const raw = localStorage.getItem(KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidResult);
	} catch {
		return [];
	}
}

// localStorage.setItem は quota 超過などで throw する可能性があるため捕捉する。
// 失敗時は alert で通知し false を返す。
function write(results: TestResult[]): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		localStorage.setItem(KEY, JSON.stringify(results));
		return true;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (typeof alert !== 'undefined') {
			alert(`Failed to save to localStorage: ${msg}`);
		}
		return false;
	}
}

export function listResults(): TestResult[] {
	return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function saveResult(result: TestResult): boolean {
	const all = read();
	all.push(result);
	return write(all);
}

export function deleteResult(id: string): boolean {
	return write(read().filter((r) => r.id !== id));
}

export function clearAll(): boolean {
	return write([]);
}
