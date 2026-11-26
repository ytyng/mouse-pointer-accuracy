# AGENTS.md

This file is a guide for AI coding agents (Claude Code, etc.).
For a project overview aimed at humans, see [`README.md`](./README.md).

## Project Overview

A SvelteKit web app that measures mouse pointer accuracy and speed.
It is fully client-side (`ssr = false`), and data is stored in `localStorage`. It is deployed to Vercel.

## Directory Structure

```
mouse-pointer-accuracy/
├── AGENTS.md                          This file (symlinked from CLAUDE.md)
├── CLAUDE.md → AGENTS.md
├── README.md                          User-facing overview
├── vercel.json                        Vercel build settings (repo root)
├── .gitmodules                        svelteutils submodule definition
└── frontend/
    ├── package.json
    ├── svelte.config.js               adapter-vercel
    ├── vite.config.ts
    ├── tsconfig.json                  Excludes svelteutils from type checking
    ├── eslint.config.js               prettier integration
    ├── .prettierrc                    Follows pop-three / domainhike
    ├── README.md                      frontend-specific documentation
    ├── sh/
    │   └── build-for-vercel.sh        Vercel build script (fetches the submodule with a PAT)
    └── src/
        ├── app.html                   HTML shell + Bootstrap Icons CDN
        ├── app.d.ts
        ├── lib/
        │   ├── types.ts               TestPattern / TestResult / Target / ClickEvent
        │   ├── patterns.ts            PATTERNS constant + getPattern / listPatterns
        │   ├── storage.ts             localStorage read/write and validation
        │   ├── export.ts              JSON / TSV / Markdown export
        │   ├── i18n.ts                i18nKit (svelteutils wrapper)
        │   └── svelteutils/           git submodule (cyberneura/svelteutils, private)
        └── routes/
            ├── +layout.svelte
            ├── +layout.ts             ssr = false
            ├── layout.css             Tailwind import
            ├── +page.svelte           Home (pattern list + result list)
            └── test/[pattern]/+page.svelte   Measurement page
```

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes mode enforced)
- **TypeScript** (strict)
- **Tailwind CSS 4**
- **Bootstrap Icons 1.11** (CDN)
- **adapter-vercel** (`@sveltejs/adapter-vercel`)
- **pnpm** (lockfile required, Node `>=22.13.0`)
- **prettier** + **eslint** (formatting + lint)

> SvelteKit 2 / Svelte 5 (runes) is a generation with many breaking changes.
> When you want to check an API, fetch the latest documentation with the **context7 MCP**.
> Example: `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
> Library IDs: `/sveltejs/svelte`, `/sveltejs/kit`

## Development Flow

### Initial setup

```sh
# Fetch the submodule (private repo: cyberneura/svelteutils)
git submodule update --init --recursive

cd frontend
pnpm install
```

### Everyday commands

```sh
cd frontend
pnpm dev         # Development server (http://localhost:5173)
pnpm build       # Production build (Vercel adapter)
pnpm preview     # Check the production build locally
pnpm check       # svelte-check (type checking)
pnpm lint        # prettier --check + eslint
pnpm format      # prettier --write (formatting)
```

### Unit tests

No test framework (vitest, etc.) has been introduced yet.
When adding one, consult the latest documentation for `/vitest-dev/vitest` with the context7 MCP.

## Development Patterns

### i18n (Japanese / English)

Get the locale with `i18nKit()` and switch strings with `_(ja, en)`.

```ts
import { i18nKit } from '$lib/i18n';
const { _, lang } = i18nKit();
// _(ja, en) gives the string for the browser language
```

The browser language is detected automatically from `navigator.language`, and `ssr = false` is set in `+layout.ts`
to avoid hydration mismatches.

### TestPattern

Add patterns to the `PATTERNS` constant in `src/lib/patterns.ts`. `name` / `description` /
`scoreFormula` have a `{ ja, en }` structure, and `version` (number) is incremented when the specification changes.

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

### TestResult (localStorage storage format)

Only the summary is stored. Click details (`ClickEvent[]`) and `patternName` are not stored.
When displaying or exporting, the name is resolved each time from `patternId` with `getPattern(id).name`.
Because `patternVersion` is kept, the conditions under which an old record was taken are still known even if the master specification is bumped later.

### Validation

`isValidResult` in `storage.ts` validates types when reading from localStorage.
When you add a new field, update `isValidResult` as well (be careful about compatibility with old data).

## Deployment (Vercel)

### Vercel-side settings
- Root Directory: default (repo root)
- Framework Preset: Other
- Node.js Version: 22.13 or higher
- Environment Variables: `GITHUB_PAT` (a fine-grained PAT that can read cyberneura/svelteutils)

### How it works

The `buildCommand` in `vercel.json` at the repo root calls `frontend/sh/build-for-vercel.sh`,
and the script does the following:

1. Passes `GITHUB_PAT` to git via `GIT_ASKPASS` (the PAT is not embedded in the URL)
2. Clones svelteutils with `git submodule update --init --recursive`
3. Runs `pnpm install --frozen-lockfile` + `pnpm build` in `frontend/`
4. Moves `frontend/.vercel/output` to `.vercel/output` at the repo root (idempotent)

See `frontend/sh/build-for-vercel.sh` for details.

## Workflow (recommended)

### From code change → PR creation → merge

1. Check `git status` before creating a branch
2. Develop / fix
3. Make `pnpm check` / `pnpm lint` pass (required before pushing)
4. Self-review the staged changes with **`/review-stage`**
5. Create a feature branch → commit → push → create a PR with **`/feature-pr`**
6. Wait for the Copilot review with **`/wait-copilot-review`**
7. Address review comments with **`/review-pr-comment`**
8. Repeat the cycle of addressing review comments → pushing again → requesting another review until Copilot returns `no new comments`

### Commit messages

- No Kansai dialect, no emoji
- Do not include Claude Code signatures (Co-Authored-By, etc.)
- Use the email `t@ytyng.com`

### Prettier / ESLint

- Indent with **2 spaces** (`useTabs: false`)
- Single quotes / `trailingComma: 'none'` / `printWidth: 100`
- **Do not add** `prettier-plugin-tailwindcss` (compatibility problems with svelte plugin 3.5.x;
  see "Notes" in `frontend/README.md` for details)

## Caveats

### svelteutils

`src/lib/svelteutils/` is a **private git submodule** (cyberneura/svelteutils).
- Excluded from type checking via `exclude` in `tsconfig.json`
- Excluded from lint via `ignores` in `eslint.config.js`
- Excluded from formatting via `.prettierignore`
- Cloned with `GITHUB_PAT` during the Vercel build

### ssr = false

`ssr = false` is set in `+layout.ts`. Reasons:
- It depends on localStorage and navigator.language
- i18n is resolved entirely from the client language

Be careful with any change that enables SSR. There are direct references to `localStorage`, `window`, and so on in various places.

### Modal a11y

The intro / pause modals are placed at the root level of `+page.svelte` (test) (outside the work area).
They have `role="dialog"` / `aria-modal` / `aria-labelledby`, and `$effect` moves
focus to the primary button (a focus trap is not implemented).
