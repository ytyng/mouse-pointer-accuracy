import type { TestResult } from './types';
import { getDateTimeString } from './svelteutils/date';

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

export function toJSON(results: TestResult[]): string {
	return JSON.stringify(results, null, 2);
}

export function toTSV(results: TestResult[]): string {
	const header = [
		'record_id',
		'name',
		'pattern_id',
		'pattern_name',
		'created_at',
		'score',
		'total_ms',
		'total_clicks',
		'hit_clicks',
		'miss_clicks',
		'miss_rate',
		'avg_interval_ms',
		'click_index',
		'target_id',
		'expected_x',
		'expected_y',
		'clicked_x',
		'clicked_y',
		'hit',
		't_since_start_ms',
		't_since_prev_ms'
	].join('\t');

	const rows: string[] = [header];
	for (const r of results) {
		r.clicks.forEach((c, i) => {
			rows.push(
				[
					sanitizeTsvCell(r.id),
					sanitizeTsvCell(r.name),
					sanitizeTsvCell(r.patternId),
					sanitizeTsvCell(r.patternName),
					sanitizeTsvCell(r.createdAt),
					// score は旧レコードでは未定義の可能性があるため空セルにする (0 と区別)
					r.score == null ? '' : r.score.toFixed(2),
					fmtMs(r.totalMs),
					String(r.totalClicks),
					String(r.hitClicks),
					String(r.missClicks),
					// miss_rate は 0-1 のレシオで内部値・JSON と統一
					r.missRate.toFixed(6),
					fmtMs(r.avgIntervalMs),
					String(i),
					String(c.targetId),
					c.expectedX.toFixed(1),
					c.expectedY.toFixed(1),
					c.clickedX.toFixed(1),
					c.clickedY.toFixed(1),
					c.hit ? '1' : '0',
					fmtMs(c.tSinceStart),
					fmtMs(c.tSincePrev)
				].join('\t')
			);
		});
	}
	return rows.join('\n');
}

export function toMarkdown(results: TestResult[]): string {
	const out: string[] = ['# Mouse Pointer Accuracy Records', ''];
	for (const r of results) {
		out.push(`## ${sanitizeMdInline(r.name)}`);
		out.push('');
		out.push(
			`- **Pattern**: ${sanitizeMdInline(r.patternName)} (\`${sanitizeMdInline(r.patternId)}\`)`
		);
		out.push(`- **Created**: ${fmtDateTime(r.createdAt)}`);
		out.push(`- **Score**: ${r.score == null ? '-' : r.score.toFixed(2)}`);
		out.push(`- **Total time**: ${fmtSec(r.totalMs)} s`);
		out.push(`- **Clicks**: ${r.totalClicks} (hit ${r.hitClicks} / miss ${r.missClicks})`);
		out.push(`- **Miss rate**: ${fmtPct(r.missRate)}`);
		out.push(`- **Avg interval**: ${fmtSec(r.avgIntervalMs)} s`);
		out.push('');
		out.push('| # | target | expected (x,y) | clicked (x,y) | hit | Δprev (s) | t (s) |');
		out.push('|---|--------|----------------|---------------|-----|-----------|-------|');
		r.clicks.forEach((c, i) => {
			out.push(
				`| ${i} | ${c.targetId} | (${c.expectedX.toFixed(0)}, ${c.expectedY.toFixed(0)}) | (${c.clickedX.toFixed(0)}, ${c.clickedY.toFixed(0)}) | ${c.hit ? 'YES' : 'NO'} | ${fmtSec(c.tSincePrev)} | ${fmtSec(c.tSinceStart)} |`
			);
		});
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
