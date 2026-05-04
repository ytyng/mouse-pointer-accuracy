# frontend

SvelteKit 製のフロントエンド。プロジェクト概要は[ルートの README](../README.md) を参照。

## 開発

`src/lib/svelteutils` は git submodule なので、未取得なら先に初期化:

```sh
git submodule update --init --recursive
```

その後:

```sh
pnpm install
pnpm dev
```

## ビルド

```sh
pnpm build
pnpm preview  # production build をローカルで確認
```

## チェック

```sh
pnpm check    # svelte-check (型チェック)
pnpm lint     # prettier --check + eslint
pnpm format   # prettier --write (整形)
```

## Vercel デプロイ

`@sveltejs/adapter-vercel` を使う。`src/lib/svelteutils` が private submodule
(`cyberneura/svelteutils`) のため、Vercel の build は GitHub PAT 経由で submodule
を clone する必要がある。

### Vercel 側設定

- **Root Directory**: (デフォルト = repo root)
- **Framework Preset**: Other (vercel.json で全て制御するため)
- **Node.js Version**: 22.x
- **Environment Variables**:
  - `GITHUB_PAT`: cyberneura/svelteutils を clone できる Fine-grained PAT
    (`Contents: Read` 権限)。
    https://github.com/settings/tokens?type=beta で発行する。

### ビルドの仕組み

repo root の `vercel.json` で `buildCommand` を `frontend/sh/build-for-vercel.sh`
にしている。スクリプトの動作:

1. repo root に移動して `GIT_ASKPASS` 経由で `GITHUB_PAT` を git に渡す
   (URL に PAT を埋め込まないことでログ漏洩を防ぐ)。
2. `git submodule update --init --recursive` で svelteutils を clone。
3. `frontend/` で `pnpm install --frozen-lockfile` + `pnpm build`。
4. `frontend/.vercel/output` を repo root の `.vercel/output` に移動
   (Vercel Build Output API の要求)。

詳細は `frontend/sh/build-for-vercel.sh` を参照。

## メモ

- `prettier-plugin-tailwindcss` は今回入れていない。
  `prettier-plugin-svelte` 3.5.x と組み合わさると `+page.svelte` で
  "TypeError: getVisitorKeys is not a function" のフォーマット失敗が発生するため。
  Tailwind クラスの自動ソートが必要になり、互換性のあるバージョンが揃った時点で再導入する。
