import type { TestResult } from './types';
import { i18nKit } from './i18n';

const KEY = 'mpa.results.v1';

// サマリーレコードの最低限の整合性を確認する。
// 過去バージョンで保存された patternName / clicks 等の余分なフィールドが含まれていても
// 現行コードからは無視される (TestResult の型では未定義)。
function isValidResult(r: unknown): r is TestResult {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if (
    typeof o.id !== 'string' ||
    typeof o.name !== 'string' ||
    typeof o.patternId !== 'string' ||
    typeof o.patternVersion !== 'number' ||
    typeof o.createdAt !== 'string' ||
    typeof o.totalMs !== 'number' ||
    typeof o.totalClicks !== 'number' ||
    typeof o.hitClicks !== 'number' ||
    typeof o.missClicks !== 'number' ||
    typeof o.missRate !== 'number' ||
    typeof o.avgIntervalMs !== 'number'
  ) {
    return false;
  }
  // score は optional なので、存在する場合のみ number チェック
  if (o.score !== undefined && typeof o.score !== 'number') return false;
  return true;
}

function read(): TestResult[] {
  if (typeof localStorage === 'undefined') return [];
  // localStorage.getItem 自体も privacy mode / restricted storage で SecurityError を
  // throw しうるため、JSON.parse とまとめて try/catch する。
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidResult);
  } catch {
    return [];
  }
}

type Op = 'save' | 'delete' | 'clear';

function localizeOpFailure(op: Op, errorMsg: string): string {
  const { _ } = i18nKit();
  const label =
    op === 'save'
      ? _('保存に失敗しました', 'Failed to save')
      : op === 'delete'
        ? _('削除に失敗しました', 'Failed to delete')
        : _('全削除に失敗しました', 'Failed to clear all');
  return `${label}: ${errorMsg}`;
}

// localStorage.setItem は quota 超過などで throw する可能性があるため捕捉する。
// 失敗時は op 別の alert で通知し false を返す。
function write(results: TestResult[], op: Op): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(results));
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (typeof alert !== 'undefined') {
      alert(localizeOpFailure(op, msg));
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
  return write(all, 'save');
}

export function deleteResult(id: string): boolean {
  return write(
    read().filter((r) => r.id !== id),
    'delete'
  );
}

// 指定された id 集合のレコードをまとめて削除する。
// 引数なしの clearAll も別途用意して全削除を区別する。
export function deleteResults(ids: string[]): boolean {
  const set = new Set(ids);
  return write(
    read().filter((r) => !set.has(r.id)),
    'delete'
  );
}

export function clearAll(): boolean {
  return write([], 'clear');
}
