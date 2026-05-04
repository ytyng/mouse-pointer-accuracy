# Mouse Pointer Accuracy

A web app for measuring mouse pointer accuracy and speed.

It asks you to click 8 small circles laid out on the screen in a fixed order as quickly and accurately as possible, then computes a score from the elapsed time and the number of miss-clicks. Useful for comparing pointing devices such as mice, trackpads, and trackballs.

Public site: https://mouse-pointer.ytyng.com/

## Features

- **Test pattern**: `sequential-1` (click 8 points in the order `1→2→3→4→5→6→7→8→1` for 3 laps)
- **Metrics**: total time, hit / miss count, miss rate, average inter-click interval, score
- **Score formula (sequential-1)**: `120 - elapsed seconds - misses × 2`
- **Persistence**: results saved with a name in browser `localStorage` (`mpa.results.v1`)
- **Export**: download individual or bulk records as JSON / TSV / Markdown
- **i18n**: auto-switch between Japanese / English based on browser language

## Work area

Fixed at 1600 × 900 px. We recommend a display with HDMI (1920 × 1080) resolution or higher, with the browser maximized. If the area does not fit because of browser chrome (large tab bar, etc.), try a different browser.

## How to play

- Pick a test pattern from the home page.
- Press Start to begin measuring.
- Click the highlighted (red) target in sequence.
- Arrows indicate the next move (solid red = current move, dashed amber = next preview).
- Misses are shown with a red X mark and a red screen-edge flash.
- ESC / right-click / the centered Cancel button pause the test (resume or cancel).
- After completion, enter a name and save — the record appears in the home page list.

## Tech stack

- SvelteKit 2 + Svelte 5 (runes mode)
- TypeScript
- Tailwind CSS 4
- Fully client-rendered (`ssr = false`)

## Development

`src/lib/svelteutils` is a git submodule, so use `--recurse-submodules` on first clone:

```sh
git clone --recurse-submodules https://github.com/ytyng/mouse-pointer-accuracy.git
```

If already cloned without submodules:

```sh
git submodule update --init --recursive
```

Then:

```sh
cd frontend
pnpm install
pnpm dev
```

Build:

```sh
pnpm build
```

Type-check / lint / format:

```sh
pnpm check    # svelte-check (type-check)
pnpm lint     # prettier --check + eslint
pnpm format   # prettier --write
```

## Deployment

Deployed to Vercel via `@sveltejs/adapter-vercel`. The private submodule (`cyberneura/svelteutils`) is cloned with a `GITHUB_PAT` environment variable through `frontend/sh/build-for-vercel.sh`. See [`frontend/README.md`](./frontend/README.md#vercel-deploy) for details.

## Guide for AI agents

[`AGENTS.md`](./AGENTS.md) (symlinked from `CLAUDE.md`) contains the project layout, development workflow, coding conventions, and deployment notes.
