export type TargetId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Target {
  id: TargetId;
  x: number;
  y: number;
}

export interface TestPattern {
  id: string;
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  workWidth: number;
  workHeight: number;
  targetDiameter: number;
  targets: Target[];
  sequence: TargetId[];
  score: (totalMs: number, missClicks: number) => number;
  scoreFormula: { ja: string; en: string };
}

export interface ClickEvent {
  targetId: TargetId;
  clickedX: number;
  clickedY: number;
  expectedX: number;
  expectedY: number;
  hit: boolean;
  tSinceStart: number;
  tSincePrev: number;
}

export interface TestResult {
  id: string;
  name: string;
  patternId: string;
  patternName: string;
  createdAt: string;
  totalMs: number;
  totalClicks: number;
  hitClicks: number;
  missClicks: number;
  missRate: number;
  avgIntervalMs: number;
  // Optional: 旧バージョンで保存された記録には score が無い場合があるため
  score?: number;
  clicks: ClickEvent[];
}
