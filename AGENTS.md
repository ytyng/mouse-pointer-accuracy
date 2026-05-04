# AGENTS.md

このファイルは AI コーディングエージェント (Claude Code 等) が参照するためのガイド。
人間向けプロジェクト概要は [`README.md`](./README.md) を参照。

## プロジェクト概要

マウスポインタの精度・速度を計測する SvelteKit 製の Web アプリ。
完全クライアントサイド (`ssr = false`)、データは `localStorage` に保存。Vercel にデプロイする。

## ディレクトリ構造

```
mouse-pointer-accuracy/
├── AGENTS.md                          このファイル (CLAUDE.md からシンボリックリンク)
├── CLAUDE.md → AGENTS.md
├── README.md                          ユーザー向け概要
├── vercel.json                        Vercel build 設定 (repo root)
├── .gitmodules                        svelteutils サブモジュール定義
└── frontend/
    ├── package.json
    ├── svelte.config.js               adapter-vercel
    ├── vite.config.ts
    ├── tsconfig.json                  svelteutils を型チェック対象から除外
    ├── eslint.config.js               prettier 統合
    ├── .prettierrc                    pop-three / domainhike 準拠
    ├── README.md                      frontend 個別ドキュメント
    ├── sh/
    │   └── build-for-vercel.sh        Vercel ビルドスクリプト (PAT で submodule 取得)
    └── src/
        ├── app.html                   HTML シェル + Bootstrap Icons CDN
        ├── app.d.ts
        ├── lib/
        │   ├── types.ts               TestPattern / TestResult / Target / ClickEvent
        │   ├── patterns.ts            PATTERNS 定数 + getPattern / listPatterns
        │   ├── storage.ts             localStorage 読み書きと validation
        │   ├── export.ts              JSON / TSV / Markdown エクスポート
        │   ├── i18n.ts                i18nKit (svelteutils ラッパー)
        │   └── svelteutils/           git submodule (cyberneura/svelteutils, private)
        └── routes/
            ├── +layout.svelte
            ├── +layout.ts             ssr = false
            ├── layout.css             Tailwind import
            ├── +page.svelte           ホーム (パターン一覧 + 記録一覧)
            └── test/[pattern]/+page.svelte   計測ページ
```

## 技術スタック

- **SvelteKit 2** + **Svelte 5** (runes mode 強制)
- **TypeScript** (strict)
- **Tailwind CSS 4**
- **Bootstrap Icons 1.11** (CDN)
- **adapter-vercel** (`@sveltejs/adapter-vercel`)
- **pnpm** (lockfile 必須、Node `>=22.13.0`)
- **prettier** + **eslint** (フォーマット + lint)

> SvelteKit 2 / Svelte 5 (runes) は破壊的変更が多い世代。
> API を確認したいときは **context7 MCP** で最新ドキュメントを取得する。
> 例: `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
> ライブラリ ID: `/sveltejs/svelte`, `/sveltejs/kit`

## 開発フロー

### 初回セットアップ

```sh
# submodule 取得 (private repo: cyberneura/svelteutils)
git submodule update --init --recursive

cd frontend
pnpm install
```

### 日常コマンド

```sh
cd frontend
pnpm dev         # 開発サーバー (http://localhost:5173)
pnpm build       # 本番ビルド (Vercel adapter)
pnpm preview     # 本番ビルドをローカル確認
pnpm check       # svelte-check (型チェック)
pnpm lint        # prettier --check + eslint
pnpm format      # prettier --write (整形)
```

### ユニットテスト

現時点でテストフレームワーク (vitest 等) は導入していない。
追加時は context7 MCP で `/vitest-dev/vitest` の最新ドキュメントを参照する。

## 開発パターン

### i18n (日本語 / 英語)

`i18nKit()` でロケールを取得し `_(ja, en)` で文字列を切り替える。

```ts
import { i18nKit } from '$lib/i18n';
const { _, lang } = i18nKit();
// _(ja, en) でブラウザ言語に応じた文字列
```

ブラウザ言語は `navigator.language` から自動判定、`+layout.ts` で `ssr = false` を設定して
ハイドレーション不整合を回避している。

### TestPattern

`src/lib/patterns.ts` の `PATTERNS` 定数に追加する。`name` / `description` /
`scoreFormula` は `{ ja, en }` 構造、`version` (number) は仕様変更時に増やす。

```ts
'pattern-id': {
  id: 'pattern-id',
  version: 1,
  name: { ja: '名前', en: 'Name' },
  description: { ja: '...', en: '...' },
  workWidth, workHeight, targetDiameter,
  targets: [...],
  sequence: [...],
  score: (totalMs, missClicks) => ...,
  scoreFormula: { ja: '...', en: '...' }
}
```

### TestResult (localStorage 保存形式)

サマリーのみ保存。クリック詳細 (`ClickEvent[]`) や `patternName` は保存しない。
表示・エクスポート時に `patternId` から `getPattern(id).name` で都度解決する。
`patternVersion` を保持しているので、後でマスター仕様が上がっても旧記録の取得条件が分かる。

### バリデーション

`storage.ts` の `isValidResult` で localStorage 読み込み時に型検証する。
新フィールドを追加した場合は `isValidResult` も更新すること (旧データ互換に注意)。

## デプロイ (Vercel)

### Vercel 側設定
- Root Directory: デフォルト (repo root)
- Framework Preset: Other
- Node.js Version: 22.13 以上
- Environment Variables: `GITHUB_PAT` (cyberneura/svelteutils を Read できる Fine-grained PAT)

### 仕組み

repo root の `vercel.json` の `buildCommand` が `frontend/sh/build-for-vercel.sh` を呼び、
スクリプトが下記を行う:

1. `GIT_ASKPASS` 経由で `GITHUB_PAT` を git に渡す (URL に PAT を埋め込まない)
2. `git submodule update --init --recursive` で svelteutils を clone
3. `frontend/` で `pnpm install --frozen-lockfile` + `pnpm build`
4. `frontend/.vercel/output` を repo root の `.vercel/output` に移動 (冪等)

詳細は `frontend/sh/build-for-vercel.sh` を参照。

## ワークフロー (推奨)

### コード変更 → PR 作成 → マージまで

1. ブランチを切る前に `git status` を確認
2. 開発・修正を行う
3. `pnpm check` / `pnpm lint` をパスさせる (push 前必須)
4. **`/review-stage`** で staging 内容をセルフレビュー
5. **`/feature-pr`** で feature ブランチ作成 → コミット → push → PR 作成
6. **`/wait-copilot-review`** で Copilot レビューを待つ
7. **`/review-pr-comment`** でレビューコメントへ対応
8. レビューコメント対応 → 再 push → 再レビュー依頼 のサイクルを Copilot が `no new comments` を返すまで繰り返す

### コミットメッセージ

- 関西弁不可、絵文字不可
- Claude Code 署名 (Co-Authored-By 等) は入れない
- メールは `t@ytyng.com`

### Prettier / ESLint

- インデントは **スペース 2 つ** (`useTabs: false`)
- Single quote / `trailingComma: 'none'` / `printWidth: 100`
- `prettier-plugin-tailwindcss` は **入れない** (svelte plugin 3.5.x との互換性問題、
  詳細は `frontend/README.md` の「メモ」を参照)

## 注意事項

### svelteutils

`src/lib/svelteutils/` は **private な git submodule** (cyberneura/svelteutils)。
- `tsconfig.json` の `exclude` で型チェック対象から除外
- `eslint.config.js` の `ignores` で lint 対象から除外
- `.prettierignore` で format 対象から除外
- Vercel ビルド時は `GITHUB_PAT` で clone

### ssr = false

`+layout.ts` で `ssr = false` にしている。理由:
- localStorage と navigator.language に依存するため
- i18n がクライアント言語で完結するため

SSR を有効化する変更は慎重に。`localStorage` 直接参照、`window` 参照などが各所にある。

### Modal a11y

intro / pause modal は `+page.svelte` (test) のルートレベルに配置 (work area 外)。
`role="dialog"` / `aria-modal` / `aria-labelledby` を付与し、`$effect` で主要ボタンに
focus を移動している (focus trap までは実装していない)。
