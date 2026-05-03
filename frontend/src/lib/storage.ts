import type { TestResult } from './types';

const KEY = 'mpa.results.v1';

function isValidResult(r: unknown): r is TestResult {
	if (!r || typeof r !== 'object') return false;
	const o = r as Record<string, unknown>;
	return (
		typeof o.id === 'string' &&
		typeof o.patternId === 'string' &&
		typeof o.createdAt === 'string' &&
		typeof o.totalMs === 'number' &&
		Array.isArray(o.clicks)
	);
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

function write(results: TestResult[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify(results));
}

export function listResults(): TestResult[] {
	return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function saveResult(result: TestResult): void {
	const all = read();
	all.push(result);
	write(all);
}

export function deleteResult(id: string): void {
	write(read().filter((r) => r.id !== id));
}

export function clearAll(): void {
	write([]);
}
