<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { listPatterns } from '$lib/patterns';
  import { listResults, deleteResult, deleteResults, clearAll } from '$lib/storage';
  import {
    toJSON,
    toTSV,
    toMarkdown,
    download,
    fmtSec,
    fmtDateTime,
    sanitizeFilename
  } from '$lib/export';
  import { i18nKit } from '$lib/i18n';
  import { humanReadableTime } from '$lib/svelteutils/time';
  import type { TestResult } from '$lib/types';

  const { _, lang } = i18nKit();

  const patterns = listPatterns();
  let results = $state<TestResult[]>([]);
  let selectedPatternFilter = $state<string>('all');

  onMount(() => {
    results = listResults();
  });

  const filteredResults = $derived(
    selectedPatternFilter === 'all'
      ? results
      : results.filter((r) => r.patternId === selectedPatternFilter)
  );

  function refresh() {
    results = listResults();
  }

  function onDelete(id: string, name: string) {
    if (!confirm(_(`「${name}」を削除しますか?`, `Delete "${name}"?`))) return;
    deleteResult(id);
    refresh();
  }

  // フィルター中はそのフィルターに該当するレコードのみ削除する。
  // 全パターン表示時 ('all') のみ全削除を行う。
  function onClearAll() {
    if (selectedPatternFilter === 'all') {
      if (!confirm(_('全ての記録を削除しますか?', 'Delete all records?'))) return;
      clearAll();
    } else {
      const ids = filteredResults.map((r) => r.id);
      if (ids.length === 0) return;
      if (
        !confirm(
          _(
            `現在のフィルターに該当する ${ids.length} 件を削除しますか?`,
            `Delete ${ids.length} filtered records?`
          )
        )
      )
        return;
      deleteResults(ids);
    }
    refresh();
  }

  function ts(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  function exportJSON() {
    download(`mpa-records-${ts()}.json`, 'application/json', toJSON(filteredResults));
  }
  function exportTSV() {
    download(`mpa-records-${ts()}.tsv`, 'text/tab-separated-values', toTSV(filteredResults));
  }
  function exportMD() {
    download(`mpa-records-${ts()}.md`, 'text/markdown', toMarkdown(filteredResults));
  }

  function exportSingle(r: TestResult, kind: 'json' | 'tsv' | 'md') {
    const stem = sanitizeFilename(`mpa-${r.patternId}-${r.name}-${ts()}`);
    if (kind === 'json') download(`${stem}.json`, 'application/json', toJSON([r]));
    if (kind === 'tsv') download(`${stem}.tsv`, 'text/tab-separated-values', toTSV([r]));
    if (kind === 'md') download(`${stem}.md`, 'text/markdown', toMarkdown([r]));
  }
</script>

<div class="mx-auto max-w-6xl p-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold flex items-center gap-3">
      <i class="bi bi-bullseye text-rose-500"></i>
      Mouse Pointer Accuracy
    </h1>
    <p class="text-slate-500 mt-1">
      {_('マウスポインタの精度・速度を計測する。', 'Measure mouse pointer accuracy and speed.')}
    </p>
  </header>

  <section class="mb-12">
    <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
      <i class="bi bi-grid-3x3-gap text-slate-500"></i>
      {_('テストパターン', 'Test patterns')}
    </h2>
    <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each patterns as p (p.id)}
        <li
          class="border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition bg-slate-50"
        >
          <a href={resolve('/test/[pattern]', { pattern: p.id })} class="block group">
            <div class="flex items-center justify-between gap-2">
              <div class="font-semibold mt-0.5">{_(p.name.ja, p.name.en)}</div>
            </div>
            <div class="text-sm text-slate-600 mt-2">
              {_(p.description.ja, p.description.en)}
            </div>
            <div class="flex justify-between items-center mt-3">
              <div class="text-xs text-slate-500 flex items-center gap-1">
                <i class="bi bi-cursor-fill"></i>
                {_('クリック数', 'Clicks')}
                {p.sequence.length}
              </div>
              <div class="text-sm text-slate-800 group-hover:underline">
                {_('このテストを行う', 'Run this test')} <i class="bi bi-arrow-right"></i>
              </div>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <i class="bi bi-clipboard-data text-slate-500"></i>
        {_('記録', 'Records')} ({filteredResults.length})
      </h2>
      <div class="flex items-center gap-2">
        <i class="bi bi-funnel text-slate-400 text-sm"></i>
        <select
          bind:value={selectedPatternFilter}
          class="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          <option value="all">{_('すべてのパターン', 'All patterns')}</option>
          {#each patterns as p (p.id)}
            <option value={p.id}>{_(p.name.ja, p.name.en)}</option>
          {/each}
        </select>
      </div>
    </div>

    {#if filteredResults.length === 0}
      <p class="text-slate-500 text-sm flex items-center gap-2">
        <i class="bi bi-inbox text-lg"></i>
        {#if selectedPatternFilter !== 'all' && results.length > 0}
          {_('このパターンの記録はまだありません。', 'No records for this pattern yet.')}
        {:else}
          {_(
            'まだ記録がありません。テストパターンを選んで計測してください。',
            'No records yet. Pick a pattern and run a test.'
          )}
        {/if}
      </p>
    {:else}
      <div class="flex gap-2 mb-3 flex-wrap">
        <button
          onclick={exportJSON}
          class="bg-slate-800 text-white text-sm px-3 py-1.5 rounded hover:bg-slate-700 inline-flex items-center gap-1.5"
        >
          <i class="bi bi-download"></i>
          <i class="bi bi-filetype-json"></i>
          {_('JSON 一括', 'Export JSON')}
        </button>
        <button
          onclick={exportTSV}
          class="bg-slate-800 text-white text-sm px-3 py-1.5 rounded hover:bg-slate-700 inline-flex items-center gap-1.5"
        >
          <i class="bi bi-download"></i>
          <i class="bi bi-table"></i>
          {_('TSV 一括', 'Export TSV')}
        </button>
        <button
          onclick={exportMD}
          class="bg-slate-800 text-white text-sm px-3 py-1.5 rounded hover:bg-slate-700 inline-flex items-center gap-1.5"
        >
          <i class="bi bi-download"></i>
          <i class="bi bi-filetype-md"></i>
          {_('Markdown 一括', 'Export Markdown')}
        </button>
        <div class="flex-1"></div>
        <button
          onclick={onClearAll}
          class="bg-red-600 text-white text-sm px-3 py-1.5 rounded hover:bg-red-700 inline-flex items-center gap-1.5"
        >
          <i class="bi bi-trash3"></i>
          {selectedPatternFilter === 'all'
            ? _('全削除', 'Delete all')
            : _('フィルター対象を削除', 'Delete filtered')}
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead class="text-left text-slate-500 border-b border-slate-300">
            <tr>
              <th class="py-2 pr-3">{_('名前', 'Name')}</th>
              <th class="py-2 pr-3">{_('パターン', 'Pattern')}</th>
              <th class="py-2 pr-3 text-right">{_('スコア', 'Score')}</th>
              <th class="py-2 pr-3 text-right">{_('時間(秒)', 'Time (s)')}</th>
              <th class="py-2 pr-3 text-right">{_('ミス数', 'Misses')}</th>
              <th class="py-2 pr-3 text-right">{_('ミス率', 'Miss rate')}</th>
              <th class="py-2 pr-3 text-right">{_('平均間隔(秒)', 'Avg int. (s)')}</th>
              <th class="py-2 pr-3">{_('日時', 'Date')}</th>
              <th class="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {#each filteredResults as r (r.id)}
              <tr class="border-b border-slate-100">
                <td class="py-2 pr-3 font-medium">{r.name}</td>
                <td class="py-2 pr-3 text-slate-600">{r.patternName}</td>
                <td class="py-2 pr-3 text-right tabular-nums font-semibold text-emerald-700"
                  >{r.score?.toFixed(2) ?? '-'}</td
                >
                <td class="py-2 pr-3 text-right tabular-nums">{fmtSec(r.totalMs)}</td>
                <td class="py-2 pr-3 text-right tabular-nums">{r.missClicks}</td>
                <td class="py-2 pr-3 text-right tabular-nums">{(r.missRate * 100).toFixed(2)}%</td>
                <td class="py-2 pr-3 text-right tabular-nums">{fmtSec(r.avgIntervalMs)}</td>
                <td class="py-2 pr-3 text-slate-500 text-xs">
                  <div>{fmtDateTime(r.createdAt)}</div>
                  <div class="text-slate-400">
                    {humanReadableTime(new Date(r.createdAt).getTime(), lang)}
                  </div>
                </td>
                <td class="py-2 pr-3">
                  <div class="flex gap-1 justify-end">
                    <button
                      onclick={() => exportSingle(r, 'json')}
                      title="Export JSON"
                      class="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1"
                    >
                      <i class="bi bi-filetype-json"></i> JSON
                    </button>
                    <button
                      onclick={() => exportSingle(r, 'tsv')}
                      title="Export TSV"
                      class="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1"
                    >
                      <i class="bi bi-table"></i> TSV
                    </button>
                    <button
                      onclick={() => exportSingle(r, 'md')}
                      title="Export Markdown"
                      class="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1"
                    >
                      <i class="bi bi-filetype-md"></i> MD
                    </button>
                    <button
                      onclick={() => onDelete(r.id, r.name)}
                      title="Delete"
                      class="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 inline-flex items-center gap-1"
                    >
                      <i class="bi bi-trash3"></i>
                      {_('削除', 'Delete')}
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <div class="text-xs text-slate-600 mt-3">
      {_(
        'ブラウザのローカルストレージに記録します。',
        "Records are stored in the browser's local storage."
      )}
    </div>
  </section>
</div>
