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

## メモ

- `prettier-plugin-tailwindcss` は今回入れていない。
  `prettier-plugin-svelte` 3.5.x と組み合わさると `+page.svelte` で
  "TypeError: getVisitorKeys is not a function" のフォーマット失敗が発生するため。
  Tailwind クラスの自動ソートが必要になり、互換性のあるバージョンが揃った時点で再導入する。
