<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { getPattern } from '$lib/patterns';
  import { listResults, saveResult } from '$lib/storage';
  import { i18nKit } from '$lib/i18n';
  import { fmtSec } from '$lib/export';
  import type { ClickEvent, TestResult } from '$lib/types';

  const { _ } = i18nKit();

  const patternId = $derived((page.params.pattern ?? '') as string);
  const pattern = $derived(patternId ? getPattern(patternId) : undefined);

  type Phase = 'intro' | 'running' | 'paused' | 'done';
  type MissMark = { id: number; x: number; y: number };

  let phase = $state<Phase>('intro');
  let stepIndex = $state(0);
  let clicks = $state<ClickEvent[]>([]);
  let recordName = $state('');
  let missMarks = $state<MissMark[]>([]);
  let missFlash = $state(0);
  let mouseX = $state(-1);
  let mouseY = $state(-1);
  let viewportW = $state(0);
  let viewportH = $state(0);
  let workAreaEl: HTMLElement | null = $state(null);
  let startBtnEl: HTMLButtonElement | null = $state(null);
  let resumeBtnEl: HTMLButtonElement | null = $state(null);
  let saveBtnEl: HTMLButtonElement | null = $state(null);
  // 二重保存防止用。Save ボタン押下中は再入を阻止する。
  let saving = $state(false);

  // 計測用の非リアクティブ値
  let startedAt = 0;
  let prevAt = 0;
  let pausedAt = 0;
  let totalPauseMs = 0;
  let missMarkSeq = 0;
  let summaryId = '';
  let summaryCreatedAt = '';

  const isHoveringCurrent = $derived.by(() => {
    if (!pattern || phase !== 'running' || !currentTarget) return false;
    if (mouseX < 0) return false;
    const dx = mouseX - currentTarget.x;
    const dy = mouseY - currentTarget.y;
    const r = pattern.targetDiameter / 2;
    return dx * dx + dy * dy <= r * r;
  });

  const fits = $derived(
    !!pattern && viewportW >= pattern.workWidth && viewportH >= pattern.workHeight
  );

  const currentTargetId = $derived(
    pattern && phase === 'running' ? pattern.sequence[stepIndex] : null
  );
  const currentTarget = $derived(
    pattern && currentTargetId ? pattern.targets.find((t) => t.id === currentTargetId) : null
  );
  const prevTargetId = $derived(
    pattern && phase === 'running' && stepIndex > 0 ? pattern.sequence[stepIndex - 1] : null
  );
  const prevTarget = $derived(
    pattern && prevTargetId ? pattern.targets.find((t) => t.id === prevTargetId) : null
  );
  const nextTargetId = $derived(
    pattern && phase === 'running' && stepIndex + 1 < pattern.sequence.length
      ? pattern.sequence[stepIndex + 1]
      : null
  );
  const nextTarget = $derived(
    pattern && nextTargetId ? pattern.targets.find((t) => t.id === nextTargetId) : null
  );

  const totalSteps = $derived(pattern ? pattern.sequence.length : 0);
  const hitCount = $derived(clicks.filter((c) => c.hit).length);
  const missCount = $derived(clicks.filter((c) => !c.hit).length);

  function reset() {
    phase = 'intro';
    stepIndex = 0;
    clicks = [];
    totalPauseMs = 0;
    missMarks = [];
    missFlash = 0;
    saving = false;
  }

  function start() {
    if (!pattern || !fits) return;
    clicks = [];
    stepIndex = 0;
    totalPauseMs = 0;
    startedAt = performance.now();
    prevAt = startedAt;
    phase = 'running';
  }

  function cancel() {
    reset();
  }

  function pause() {
    if (phase !== 'running') return;
    pausedAt = performance.now();
    phase = 'paused';
  }

  function resume() {
    if (phase !== 'paused') return;
    const delta = performance.now() - pausedAt;
    totalPauseMs += delta;
    prevAt += delta;
    phase = 'running';
  }

  function handleAreaMouseMove(ev: MouseEvent) {
    if (!pattern) return;
    const area = ev.currentTarget as HTMLElement;
    const rect = area.getBoundingClientRect();
    const scaleX = pattern.workWidth / rect.width;
    const scaleY = pattern.workHeight / rect.height;
    mouseX = (ev.clientX - rect.left) * scaleX;
    mouseY = (ev.clientY - rect.top) * scaleY;
  }

  function handleAreaMouseLeave() {
    mouseX = -1;
    mouseY = -1;
  }

  // 外側コンテナでのクリック (ワークエリア外も含む) を捕捉する。
  // ワークエリア内のクリックは handleAreaClick で stopPropagation され、ここには来ない。
  function handleOutsideClick(ev: MouseEvent) {
    if (!pattern || phase !== 'running' || !currentTarget || !workAreaEl) return;
    processClickAt(ev.clientX, ev.clientY, workAreaEl);
  }

  function handleAreaClick(ev: MouseEvent) {
    if (!pattern || phase !== 'running' || !currentTarget) return;
    ev.stopPropagation();
    const area = ev.currentTarget as HTMLElement;
    processClickAt(ev.clientX, ev.clientY, area);
  }

  // クリック位置をワークエリア座標系に変換し、現在ターゲットへのヒット判定とイベント記録を行う。
  // ワークエリア外のクリックも negative / overflow 座標として渡され、ヒット判定で必ず miss になる。
  function processClickAt(clientX: number, clientY: number, area: HTMLElement) {
    if (!pattern || !currentTarget) return;
    const rect = area.getBoundingClientRect();
    const scaleX = pattern.workWidth / rect.width;
    const scaleY = pattern.workHeight / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const dx = x - currentTarget.x;
    const dy = y - currentTarget.y;
    const r = pattern.targetDiameter / 2;
    const hit = dx * dx + dy * dy <= r * r;

    const now = performance.now();
    const tSinceStart = now - startedAt - totalPauseMs;
    const ev2: ClickEvent = {
      targetId: currentTarget.id,
      clickedX: x,
      clickedY: y,
      expectedX: currentTarget.x,
      expectedY: currentTarget.y,
      hit,
      tSinceStart,
      tSincePrev: now - prevAt
    };
    clicks = [...clicks, ev2];

    if (hit) {
      prevAt = now;
      if (stepIndex + 1 >= pattern.sequence.length) {
        summaryId = crypto.randomUUID();
        summaryCreatedAt = new Date().toISOString();
        phase = 'done';
      } else {
        stepIndex += 1;
      }
    } else {
      const id = ++missMarkSeq;
      missMarks = [...missMarks, { id, x, y }];
      missFlash = id;
      setTimeout(() => {
        missMarks = missMarks.filter((m) => m.id !== id);
      }, 700);
      setTimeout(() => {
        if (missFlash === id) missFlash = 0;
      }, 180);
    }
  }

  function handleContextMenu(ev: MouseEvent) {
    if (phase === 'running') {
      ev.preventDefault();
      pause();
    }
  }

  function handleKey(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && phase === 'running') {
      pause();
    }
  }

  function updateViewport() {
    viewportW = window.innerWidth;
    viewportH = window.innerHeight;
  }

  onMount(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('contextmenu', handleContextMenu);
  });

  // modal の表示状態が変わったら、各 modal 内の主要ボタンへフォーカスを移す。
  // dialog semantics (role=dialog + aria-modal) と合わせて a11y 要件に対応する。
  $effect(() => {
    if (phase === 'intro' && startBtnEl && fits) startBtnEl.focus();
    else if (phase === 'paused' && resumeBtnEl) resumeBtnEl.focus();
    else if (phase === 'done' && saveBtnEl) saveBtnEl.focus();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('contextmenu', handleContextMenu);
    }
  });

  // Done モーダル表示時に直近の記録名 (6 件、unnamed-* と重複を除外) を取得する。
  const recentNames = $derived.by<string[]>(() => {
    if (phase !== 'done') return [];
    const names: string[] = [];
    for (const r of listResults()) {
      if (!r.name || r.name.startsWith('unnamed-') || names.includes(r.name)) continue;
      names.push(r.name);
      if (names.length >= 6) break;
    }
    return names;
  });

  // 完了時に id / createdAt を一度だけ確定。recordName は入力時にだけ反映する。
  const summary = $derived.by<TestResult | null>(() => {
    if (!pattern || phase !== 'done' || clicks.length === 0) return null;
    const totalMs = clicks[clicks.length - 1].tSinceStart;
    const hits = clicks.filter((c) => c.hit);
    // 初回ヒットの tSincePrev は startedAt 基準なので「反応時間」を含む。
    // クリック間隔の平均としては 2 回目以降のヒットだけで算出する。
    const intervals = hits.slice(1).map((c) => c.tSincePrev);
    const avgIntervalMs =
      intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const missClicks = clicks.length - hits.length;
    return {
      id: summaryId,
      name: recordName.trim() || `unnamed-${summaryCreatedAt}`,
      patternId: pattern.id,
      patternVersion: pattern.version,
      createdAt: summaryCreatedAt,
      totalMs,
      totalClicks: clicks.length,
      hitClicks: hits.length,
      missClicks,
      missRate: missClicks / clicks.length,
      avgIntervalMs,
      score: pattern.score(totalMs, missClicks)
    };
  });

  function save() {
    if (saving || !summary) return;
    saving = true;
    // saveResult が false を返した場合 (localStorage quota 超過等) は
    // alert で通知済み。Done モーダルに留まりリトライ/別の操作を可能にする。
    if (!saveResult(summary)) {
      saving = false;
      return;
    }
    recordName = '';
    goto(resolve('/'));
  }
</script>

{#if !pattern}
  <div class="p-8">
    <p class="text-red-600">
      {_('パターン', 'Pattern')} "{patternId}" {_('が見つかりません。', 'not found.')}
    </p>
    <a href={resolve('/')} class="text-blue-600 underline inline-flex items-center gap-1">
      <i class="bi bi-arrow-left"></i>
      {_('トップへ戻る', 'Back to top')}
    </a>
  </div>
{:else}
  <div
    class="min-h-screen flex items-center justify-center transition-colors overflow-hidden"
    style="background-color: {missFlash > 0 && phase === 'running' ? '#ffcccc' : '#ffffff'};"
    onclick={handleOutsideClick}
    role="presentation"
  >
    <div
      bind:this={workAreaEl}
      class="relative select-none"
      style="width: {pattern.workWidth}px; height: {pattern.workHeight}px; cursor: {phase ===
      'running'
        ? 'crosshair'
        : 'default'};"
      onclick={handleAreaClick}
      onmousemove={handleAreaMouseMove}
      onmouseleave={handleAreaMouseLeave}
      role="presentation"
    >
      <!-- Arrow overlay -->
      {#if phase === 'running' && currentTarget}
        <svg
          class="absolute inset-0 pointer-events-none"
          width={pattern.workWidth}
          height={pattern.workHeight}
          viewBox="0 0 {pattern.workWidth} {pattern.workHeight}"
        >
          <defs>
            <marker
              id="arrowhead-strong"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="rgb(244 63 94 / 0.85)" />
            </marker>
            <marker
              id="arrowhead-weak"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="rgb(245 158 11 / 0.45)" />
            </marker>
          </defs>
          {#if !prevTarget}
            {@const len = 60}
            {@const gap = 16}
            {@const radius = pattern.targetDiameter / 2}
            {@const tipX = currentTarget.x + radius + gap}
            {@const tailX = tipX + len}
            <line
              x1={tailX}
              y1={currentTarget.y}
              x2={tipX}
              y2={currentTarget.y}
              stroke="rgb(244 63 94 / 0.85)"
              stroke-width="2"
              marker-end="url(#arrowhead-strong)"
            />
            <text
              x={tipX}
              y={currentTarget.y + 8 + 12}
              text-anchor="start"
              fill="rgb(244 63 94 / 0.85)"
              font-size="12"
              font-family="ui-sans-serif, system-ui, sans-serif"
            >
              {_('この点をクリック', 'Click this dot')}
            </text>
          {/if}
          {#if prevTarget}
            <!-- 矢印は 2 ターゲット間の中央 70% に描画 (両端 15% を余白) -->
            {@const pad = 0.15}
            <line
              x1={prevTarget.x + (currentTarget.x - prevTarget.x) * pad}
              y1={prevTarget.y + (currentTarget.y - prevTarget.y) * pad}
              x2={prevTarget.x + (currentTarget.x - prevTarget.x) * (1 - pad)}
              y2={prevTarget.y + (currentTarget.y - prevTarget.y) * (1 - pad)}
              stroke="rgb(244 63 94 / 0.85)"
              stroke-width="2"
              marker-end="url(#arrowhead-strong)"
            />
          {/if}
          {#if nextTarget}
            <!-- 矢印は 2 ターゲット間の中央 70% に描画 (両端 15% を余白) -->
            {@const pad = 0.15}
            <line
              x1={currentTarget.x + (nextTarget.x - currentTarget.x) * pad}
              y1={currentTarget.y + (nextTarget.y - currentTarget.y) * pad}
              x2={currentTarget.x + (nextTarget.x - currentTarget.x) * (1 - pad)}
              y2={currentTarget.y + (nextTarget.y - currentTarget.y) * (1 - pad)}
              stroke="rgb(245 158 11 / 0.45)"
              stroke-width="1.5"
              stroke-dasharray="4 3"
              marker-end="url(#arrowhead-weak)"
            />
          {/if}
        </svg>
      {/if}

      {#each pattern.targets as t (t.id)}
        {@const isCurrent = phase === 'running' && t.id === currentTargetId}
        {@const isNext = phase === 'running' && t.id === nextTargetId}
        <div
          class="absolute rounded-full transition-colors {isCurrent
            ? 'bg-rose-500 ring-4 ring-rose-300/60 animate-pulse'
            : isNext
              ? 'bg-amber-400'
              : 'bg-slate-300'}"
          style="left: {t.x - pattern.targetDiameter / 2}px; top: {t.y -
            pattern.targetDiameter /
              2}px; width: {pattern.targetDiameter}px; height: {pattern.targetDiameter}px;"
        ></div>
        <div
          class="absolute text-[10px] text-slate-400 font-mono pointer-events-none text-center"
          style="left: {t.x}px; top: {t.y +
            pattern.targetDiameter / 2 +
            4}px; transform: translateX(-50%);"
        >
          {t.id}
        </div>
      {/each}

      <!-- Hover ring -->
      {#if isHoveringCurrent && currentTarget}
        <div
          class="absolute pointer-events-none hover-ring rounded-full border-2 border-rose-500"
          style="left: {currentTarget.x - 30}px; top: {currentTarget.y -
            30}px; width: 60px; height: 60px;"
        ></div>
      {/if}

      <!-- Miss marks -->
      {#each missMarks as m (m.id)}
        <div
          class="absolute pointer-events-none miss-mark"
          style="left: {m.x - 12}px; top: {m.y - 12}px; width: 24px; height: 24px;"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <line
              x1="4"
              y1="4"
              x2="20"
              y2="20"
              stroke="rgb(220 38 38)"
              stroke-width="3"
              stroke-linecap="round"
            />
            <line
              x1="20"
              y1="4"
              x2="4"
              y2="20"
              stroke="rgb(220 38 38)"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
        </div>
      {/each}

      <!-- Cancel button at center -->
      {#if phase === 'running'}
        <button
          onclick={(e) => {
            e.stopPropagation();
            pause();
          }}
          class="absolute text-xs text-slate-400 hover:text-slate-700 underline inline-flex items-center gap-1"
          style="left: 50%; top: 50%; transform: translate(-50%, -50%);"
        >
          <i class="bi bi-x-circle"></i>
          {_('キャンセル', 'Cancel')}
        </button>

        <!-- Progress indicator (top-right corner of work area) -->
        <div
          class="absolute top-2 right-32 text-xs text-slate-400 tabular-nums pointer-events-none"
        >
          {stepIndex + 1} / {totalSteps} ・ {_('ヒット', 'hit')}
          {hitCount} / {_('ミス', 'miss')}
          {missCount}
        </div>
      {/if}

      <!-- Done modal -->
      {#if phase === 'done'}
        {@const r = summary}
        {#if r}
          <div
            class="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="done-modal-title"
              class="bg-white border border-slate-300 rounded-lg p-6 shadow-lg w-[480px]"
            >
              <h2 id="done-modal-title" class="text-xl font-bold mb-4 flex items-center gap-2">
                <i class="bi bi-check-circle-fill text-emerald-600"></i>
                {_('完了', 'Done')}
              </h2>
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4 text-center">
                <div class="text-xs text-emerald-700 mb-1">
                  {_('スコア', 'Score')}
                </div>
                <div class="text-4xl font-bold tabular-nums text-emerald-700">
                  {(r.score ?? 0).toFixed(2)}
                </div>
                <div class="text-[10px] text-emerald-600 mt-1 font-mono">
                  {_(pattern.scoreFormula.ja, pattern.scoreFormula.en)}
                </div>
              </div>
              <dl class="grid grid-cols-2 gap-y-2 text-sm mb-6">
                <dt class="text-slate-500">{_('合計時間', 'Total time')}</dt>
                <dd class="text-right tabular-nums font-medium">
                  {fmtSec(r.totalMs)} s
                </dd>
                <dt class="text-slate-500">{_('クリック数', 'Clicks')}</dt>
                <dd class="text-right tabular-nums">{r.totalClicks}</dd>
                <dt class="text-slate-500">{_('ヒット / ミス', 'Hit / Miss')}</dt>
                <dd class="text-right tabular-nums">{r.hitClicks} / {r.missClicks}</dd>
                <dt class="text-slate-500">{_('ミス率', 'Miss rate')}</dt>
                <dd class="text-right tabular-nums">
                  {(r.missRate * 100).toFixed(2)}%
                </dd>
                <dt class="text-slate-500">
                  {_('平均間隔 (ヒットのみ)', 'Avg interval (hits only)')}
                </dt>
                <dd class="text-right tabular-nums">{fmtSec(r.avgIntervalMs)} s</dd>
              </dl>

              <label class="block text-sm mb-2">
                {_('記録名', 'Record name')}
                <input
                  bind:value={recordName}
                  type="text"
                  placeholder={_('例: 普段のマウス + パッド', 'e.g. usual mouse + pad')}
                  class="mt-1 w-full border border-slate-300 rounded px-3 py-2"
                />
              </label>
              {#if recentNames.length > 0}
                <div class="mt-2">
                  <div class="text-xs text-slate-500 mb-1">
                    {_('直近の名前から選ぶ', 'Pick from recent names')}
                  </div>
                  <div class="flex flex-wrap gap-1">
                    {#each recentNames as n (n)}
                      <button
                        type="button"
                        onclick={() => (recordName = n)}
                        class="text-xs px-2 py-1 border border-slate-300 rounded-full hover:bg-slate-100 inline-flex items-center gap-1 max-w-[200px]"
                      >
                        <i class="bi bi-tag text-slate-400"></i>
                        <span class="truncate">{n}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="flex justify-end gap-2 mt-4">
                <button
                  onclick={reset}
                  class="px-4 py-2 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1.5"
                >
                  <i class="bi bi-arrow-counterclockwise"></i>
                  {_('もう一度', 'Retry')}
                </button>
                <button
                  bind:this={saveBtnEl}
                  onclick={save}
                  disabled={saving}
                  class="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  <i class="bi bi-floppy"></i>
                  {_('保存してトップへ', 'Save and go to top')}
                </button>
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Intro modal (component root, fixed full-viewport overlay) -->
  {#if phase === 'intro'}
    <div class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-modal-title"
        class="bg-white border border-slate-300 rounded-lg shadow-lg p-6 w-[480px] max-w-[90vw]"
      >
        <h2 id="intro-modal-title" class="text-xl font-bold mb-1">
          {_(pattern.name.ja, pattern.name.en)}
        </h2>
        <p class="text-sm text-slate-700 mb-4">
          {_(pattern.description.ja, pattern.description.en)}
        </p>
        <dl class="text-xs text-slate-500 grid grid-cols-2 gap-y-1 mb-5">
          <dt>{_('ワークエリア', 'Work area')}</dt>
          <dd class="text-right tabular-nums">
            {pattern.workWidth} × {pattern.workHeight} px
          </dd>
          <dt>{_('クリック数', 'Clicks')}</dt>
          <dd class="text-right tabular-nums">{pattern.sequence.length}</dd>
          <dt>{_('ターゲット直径', 'Target diameter')}</dt>
          <dd class="text-right tabular-nums">{pattern.targetDiameter} px</dd>
        </dl>
        {#if !fits}
          <div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
            {_(
              'ブラウザにテスト内容が全て表示されていません。HDMI 以上の解像度のディスプレイで、ブラウザウィンドウを最大化して表示させることを推奨しています。ブラウザの設定 (タブバーの大きさ等) によっては全てが表示されない場合があります。その場合は別のブラウザをお使いください。',
              'The test area does not fit in your browser. We recommend a display with HDMI resolution or higher and a maximized browser window. Depending on browser settings (tab bar size, etc.) it may not fit; in that case please try a different browser.'
            )}
            <div class="mt-2 text-amber-600 font-mono">
              {_('現在の表示領域', 'Viewport')}: {viewportW} × {viewportH} px /
              {_('必要', 'Required')}: {pattern.workWidth} × {pattern.workHeight} px
            </div>
          </div>
        {/if}
        <div class="flex justify-end gap-2">
          <a
            href={resolve('/')}
            class="px-4 py-2 border border-slate-300 rounded hover:bg-slate-100 text-sm inline-flex items-center gap-1.5"
          >
            <i class="bi bi-arrow-left"></i>
            {_('戻る', 'Back')}
          </a>
          <button
            bind:this={startBtnEl}
            onclick={(e) => {
              e.stopPropagation();
              start();
            }}
            disabled={!fits}
            class="px-5 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <i class="bi bi-play-fill"></i>
            {_('スタート', 'Start')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Pause modal (component root, fixed full-viewport overlay) -->
  {#if phase === 'paused'}
    <div class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
        class="bg-white border border-slate-300 rounded-lg shadow-lg p-6 w-[400px] max-w-[90vw]"
      >
        <h2 id="pause-modal-title" class="text-lg font-bold mb-2 flex items-center gap-2">
          <i class="bi bi-pause-circle-fill text-amber-500"></i>
          {_('一時停止', 'Paused')}
        </h2>
        <p class="text-sm text-slate-600 mb-5">
          {_(
            '計測を中断しました。再開するか、キャンセルして最初に戻ります。',
            'Measurement paused. Resume or cancel and return to the start.'
          )}
        </p>
        <div class="flex justify-end gap-2">
          <button
            onclick={(e) => {
              e.stopPropagation();
              cancel();
            }}
            class="px-4 py-2 border border-slate-300 rounded hover:bg-slate-100 text-sm inline-flex items-center gap-1.5"
          >
            <i class="bi bi-x-circle"></i>
            {_('キャンセル', 'Cancel')}
          </button>
          <button
            bind:this={resumeBtnEl}
            onclick={(e) => {
              e.stopPropagation();
              resume();
            }}
            class="px-5 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <i class="bi bi-play-fill"></i>
            {_('再開', 'Resume')}
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .miss-mark {
    animation: miss-fade 700ms ease-out forwards;
  }
  .hover-ring {
    animation: hover-in 200ms ease-out forwards;
    transform-origin: center;
  }
  @keyframes hover-in {
    0% {
      opacity: 0;
      transform: scale(2);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes miss-fade {
    0% {
      opacity: 1;
      transform: scale(1.4);
    }
    20% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(1);
    }
  }
</style>
