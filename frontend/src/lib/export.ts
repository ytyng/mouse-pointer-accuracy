import type { TestResult } from './types';
import { getDateTimeString } from './svelteutils/date';
import { getPattern } from './patterns';
import { i18nKit } from './i18n';

function fmtMs(ms: number): string {
  return ms.toFixed(1);
}

// ファイル名に使えない文字 (Windows の禁止文字 + 制御文字 + パス区切り) を _ に置換
export function sanitizeFilename(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_');
}

// TSV のセル内に入ると壊れる文字 (TAB / 改行) を半角スペースに置換
function sanitizeTsvCell(s: string): string {
  return s.replace(/[\t\r\n]/g, ' ');
}

// Markdown 見出しやテーブルセルを破壊する文字 (改行 / |) を置換
function sanitizeMdInline(s: string): string {
  return s.replace(/[\r\n]/g, ' ').replace(/\|/g, '\\|');
}

export function fmtSec(ms: number): string {
  return (ms / 1000).toFixed(2);
}

export function fmtDateTime(iso: string): string {
  return getDateTimeString(new Date(iso));
}

function fmtPct(p: number): string {
  return (p * 100).toFixed(2) + '%';
}

// patternId からマスターデータの name (現在ロケール) を取得する。
// マスターから消えた id の場合は patternId をそのまま返す。
function resolvePatternName(patternId: string): string {
  const { _ } = i18nKit();
  const p = getPattern(patternId);
  return p ? _(p.name.ja, p.name.en) : patternId;
}

export function toJSON(results: TestResult[]): string {
  return JSON.stringify(results, null, 2);
}

export function toTSV(results: TestResult[]): string {
  const header = [
    'record_id',
    'name',
    'pattern_id',
    'pattern_version',
    'pattern_name',
    'created_at',
    'score',
    'total_ms',
    'total_clicks',
    'hit_clicks',
    'miss_clicks',
    'miss_rate',
    'avg_interval_ms'
  ].join('\t');

  const rows: string[] = [header];
  for (const r of results) {
    rows.push(
      [
        sanitizeTsvCell(r.id),
        sanitizeTsvCell(r.name),
        sanitizeTsvCell(r.patternId),
        String(r.patternVersion),
        sanitizeTsvCell(resolvePatternName(r.patternId)),
        sanitizeTsvCell(r.createdAt),
        // score は旧レコードでは未定義の可能性があるため空セルにする (0 と区別)
        r.score == null ? '' : r.score.toFixed(2),
        fmtMs(r.totalMs),
        String(r.totalClicks),
        String(r.hitClicks),
        String(r.missClicks),
        // miss_rate は 0-1 のレシオで内部値・JSON と統一
        r.missRate.toFixed(6),
        fmtMs(r.avgIntervalMs)
      ].join('\t')
    );
  }
  return rows.join('\n');
}

export function toMarkdown(results: TestResult[]): string {
  const out: string[] = ['# Mouse Pointer Accuracy Records', ''];
  for (const r of results) {
    out.push(`## ${sanitizeMdInline(r.name)}`);
    out.push('');
    out.push(
      `- **Pattern**: ${sanitizeMdInline(resolvePatternName(r.patternId))} (\`${sanitizeMdInline(r.patternId)}\` v${r.patternVersion})`
    );
    out.push(`- **Created**: ${fmtDateTime(r.createdAt)}`);
    out.push(`- **Score**: ${r.score == null ? '-' : r.score.toFixed(2)}`);
    out.push(`- **Total time**: ${fmtSec(r.totalMs)} s`);
    out.push(`- **Clicks**: ${r.totalClicks} (hit ${r.hitClicks} / miss ${r.missClicks})`);
    out.push(`- **Miss rate**: ${fmtPct(r.missRate)}`);
    out.push(`- **Avg interval**: ${fmtSec(r.avgIntervalMs)} s`);
    out.push('');
  }
  return out.join('\n');
}

export function download(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
