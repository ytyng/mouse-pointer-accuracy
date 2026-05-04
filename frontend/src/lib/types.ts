export type TargetId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Target {
  id: TargetId;
  x: number;
  y: number;
}

export interface TestPattern {
  id: string;
  // パターン仕様 (ターゲット配置・スコア式・シーケンス等) を変更したら増やす。
  // 異なる version 同士の記録は厳密には同じ条件で計測されていないため比較注意。
  version: number;
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

// localStorage に保存するサマリー。
// patternName はマスターデータ (PATTERNS) から id 経由で都度引くため保存しない。
// 個別のクリック詳細 (ClickEvent[]) も保存しない。
// score / 旧フィールドは optional 扱いで、過去の保存形式との互換を保つ。
export interface TestResult {
  id: string;
  name: string;
  patternId: string;
  // 計測時の TestPattern.version を記録する。マスターのバージョンが上がっても
  // 過去の記録がどの仕様で取られたかを後から識別できるようにするため。
  patternVersion: number;
  createdAt: string;
  totalMs: number;
  totalClicks: number;
  hitClicks: number;
  missClicks: number;
  missRate: number;
  avgIntervalMs: number;
  score?: number;
}
