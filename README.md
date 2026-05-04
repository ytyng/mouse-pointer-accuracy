# Mouse Pointer Accuracy

マウスポインタの精度・速度を計測する Web アプリ。

クリック対象として配置された 8 個の小さな円を決められた順序で正確かつ高速にクリックし、所要時間とミスクリック数からスコアを算出する。マウス・トラックパッド・トラックボールなどポインティングデバイスの性能比較や、自分のコンディションの計測に使う。

## 機能

- **テストパターン**: `sequential-1` (8 点を `1→2→3→4→5→6→7→8→1` で 3 周)
- **計測項目**: 合計時間、ヒット/ミス数、ミス率、平均クリック間隔、スコア
- **スコア式 (sequential-1)**: `120 - 経過秒 - ミス数 × 2`
- **記録保存**: ブラウザの `localStorage` (`mpa.results.v1`) に名前付きで保存
- **エクスポート**: JSON / TSV / Markdown 形式で個別または一括ダウンロード
- **多言語**: ブラウザ言語設定により日本語 / 英語を自動切り替え

## ワークエリア

1600 × 900 px 固定。HDMI (1920 × 1080) 以上の解像度のディスプレイで、ブラウザを最大化して使うことを推奨。ブラウザの設定でツールバーが大きい等で収まらない場合、別のブラウザを使う必要がある。

## 操作

- ホームページからテストパターンを選ぶ
- スタートボタンで計測開始
- 赤くハイライトされたターゲットを順次クリック
- 矢印が次の動きを示す (濃い実線 = 今クリックする方向、薄い破線 = 次の予告)
- ミスは赤い X マークと画面外周の赤フラッシュでフィードバック
- ESC / 右クリック / 中央 Cancel ボタンで一時停止 (再開 or キャンセル)
- 完了後、記録名を入れて保存 → ホームページの記録一覧に表示

## 技術スタック

- SvelteKit 2 + Svelte 5 (runes mode)
- TypeScript
- Tailwind CSS 4
- 完全クライアントレンダリング (`ssr = false`)

## 開発

`src/lib/svelteutils` は git submodule なので、初回クローン時は recurse-submodules する:

```sh
git clone --recurse-submodules https://github.com/ytyng/mouse-pointer-accuracy.git
```

既にクローン済みの場合:

```sh
git submodule update --init --recursive
```

その後:

```sh
cd frontend
pnpm install
pnpm dev
```

ビルド:

```sh
pnpm build
```

型チェック / lint / 整形:

```sh
pnpm check    # svelte-check (型チェック)
pnpm lint     # prettier --check + eslint
pnpm format   # prettier --write
```

## デプロイ

Vercel に `@sveltejs/adapter-vercel` でデプロイする。private submodule
(`cyberneura/svelteutils`) を `GITHUB_PAT` 環境変数経由で clone する仕組みを
`frontend/sh/build-for-vercel.sh` に持つ。詳細は
[`frontend/README.md`](./frontend/README.md#vercel-デプロイ) を参照。

## AI エージェント向けガイド

[`AGENTS.md`](./AGENTS.md) (= `CLAUDE.md`) にプロジェクト構成・開発フロー・
コーディング規約・デプロイ手順をまとめている。
