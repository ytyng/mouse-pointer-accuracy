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
pnpm check  # svelte-check (型チェック)
pnpm lint   # eslint
```
