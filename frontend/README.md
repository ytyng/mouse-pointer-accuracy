# frontend

SvelteKit-based frontend. See the [root README](../README.md) for the project overview.

## Development

`src/lib/svelteutils` is a git submodule, so initialize it first if not yet fetched:

```sh
git submodule update --init --recursive
```

Then:

```sh
pnpm install
pnpm dev
```

## Build

```sh
pnpm build
pnpm preview  # check production build locally
```

## Checks

```sh
pnpm check    # svelte-check (type-check)
pnpm lint     # prettier --check + eslint
pnpm format   # prettier --write
```

## Vercel deploy

Uses `@sveltejs/adapter-vercel`. Because `src/lib/svelteutils` is a private submodule
(`cyberneura/svelteutils`), the Vercel build needs to clone the submodule via a
GitHub PAT.

### Vercel project settings

- **Root Directory**: (default = repo root)
- **Framework Preset**: Other (vercel.json controls everything)
- **Node.js Version**: 22.13 or later (matches `engines.node` in `package.json`)
- **Environment Variables**:
  - `GITHUB_PAT`: a Fine-grained PAT that can clone cyberneura/svelteutils
    (`Contents: Read` permission). Issue it at
    https://github.com/settings/tokens?type=beta.

### How the build works

The repo-root `vercel.json` sets `buildCommand` to `frontend/sh/build-for-vercel.sh`.
The script does:

1. Move to repo root and pass `GITHUB_PAT` to git via `GIT_ASKPASS`
   (avoids embedding the PAT in URLs to prevent log leakage).
2. `git submodule update --init --recursive` to clone svelteutils.
3. In `frontend/`, run `pnpm install --frozen-lockfile` + `pnpm build`.
4. Move `frontend/.vercel/output` to repo root `.vercel/output`
   (required by the Vercel Build Output API).

See `frontend/sh/build-for-vercel.sh` for details.

## Notes

- `prettier-plugin-tailwindcss` is intentionally not included.
  Combined with `prettier-plugin-svelte` 3.5.x it causes a
  "TypeError: getVisitorKeys is not a function" failure when formatting `+page.svelte`.
  We will reintroduce it (for automatic Tailwind class sorting) once compatible
  versions are available.
