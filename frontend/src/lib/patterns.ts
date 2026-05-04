import type { TestPattern, Target, TargetId } from './types';

const W = 1600;
const H = 900;
const D = 8;
const R = D / 2;

// Target layout (new numbering):
// 1    6    3
// 4         8
// 7    2    5
const targets: Target[] = [
  { id: 1, x: R, y: R },
  { id: 6, x: W / 2, y: R },
  { id: 3, x: W - R, y: R },
  { id: 4, x: R, y: H / 2 },
  { id: 8, x: W - R, y: H / 2 },
  { id: 7, x: R, y: H - R },
  { id: 2, x: W / 2, y: H - R },
  { id: 5, x: W - R, y: H - R }
];

const baseLap: TargetId[] = [1, 2, 3, 4, 5, 6, 7, 8, 1];
const laps = 3;

// lap は始端と終端が同じターゲット (例: [1, 2, ..., 1])。
// 2 周目以降は先頭を slice(1) で除外し、前 lap の終端と次 lap の始端の重複を防ぐ。
function buildSequence(lap: TargetId[], n: number): TargetId[] {
  const seq: TargetId[] = [...lap];
  for (let i = 1; i < n; i++) {
    seq.push(...lap.slice(1));
  }
  return seq;
}

export const PATTERNS: Record<string, TestPattern> = {
  'sequential-1': {
    id: 'sequential-1',
    version: 1, // 大きな変更があったら増やす
    name: {
      ja: '広域8点順番クリック',
      en: 'Wide 8-Point Sequence'
    },
    description: {
      ja: 'ブラウザウィンドウの四隅とその間に設定された8点を、決まった順番に3週クリックするテスト。HDMIディスプレイでブラウザウインドウを最大化してください。',
      en: 'A test to click 8 targets arranged in and around the corners of the browser window in a fixed order for 3 laps. Please maximize the browser window on an HDMI display.'
    },
    workWidth: W,
    workHeight: H,
    targetDiameter: D,
    targets,
    sequence: buildSequence(baseLap, laps),
    score: (totalMs, missClicks) => 120 - totalMs / 1000 - missClicks * 2,
    scoreFormula: {
      ja: '120 - 経過秒 - ミス数 × 2',
      en: '120 - elapsed seconds - misses × 2'
    }
  }
};

export function getPattern(id: string): TestPattern | undefined {
  return PATTERNS[id];
}

export function listPatterns(): TestPattern[] {
  return Object.values(PATTERNS);
}
