import type { TestResult } from './types';
import { getDateTimeString } from './svelteutils/date';

function fmtMs(ms: number): string {
	return ms.toFixed(1);
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
					r.id,
					r.name,
					r.patternId,
					r.patternName,
					r.createdAt,
					(r.score ?? 0).toFixed(2),
					fmtMs(r.totalMs),
					String(r.totalClicks),
					String(r.hitClicks),
					String(r.missClicks),
					(r.missRate * 100).toFixed(4),
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
		out.push(`## ${r.name}`);
		out.push('');
		out.push(`- **Pattern**: ${r.patternName} (\`${r.patternId}\`)`);
		out.push(`- **Created**: ${fmtDateTime(r.createdAt)}`);
		out.push(`- **Score**: ${(r.score ?? 0).toFixed(2)}`);
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
