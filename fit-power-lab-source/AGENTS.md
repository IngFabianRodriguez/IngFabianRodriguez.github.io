# FIT power lab: how this repository works

A website that reads the `.fit` files of a bike computer without a power meter, estimates the power of every second of the ride, draws the route (map, 3D flyover video) and the charts, and writes a new `.fit` with the estimated watts. Everything runs in the browser: there is no server and no account. Read `README.md` for what the app does for its users; this file is for whoever changes the repository.

## What the repository is made of

| Place                                    | What it holds                                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/`                            | Pure code, no React and no browser APIs: the power model, metrics, importers and exporters, map and flyover geometry. Most of the tests live here. |
| `src/features/<area>/`                   | One folder per area of the app (charts, map, library, device, flyover, settings, ...): its components, its tests and its own `messages.ts`.        |
| `src/app/`                               | Application state (`appState.ts`, `AppContext.tsx`), the translator (`i18n.ts`) and the registry of all translations (`messages.ts`).              |
| `src/lib/`                               | Small shared helpers: units, saved settings, tile servers (`tiles.ts`), downloads, persistence, service-worker control.                            |
| `src/components/ui/`                     | shadcn/ui components, generated. Do not hand-edit them beyond what the CLI produces.                                                               |
| `src/test/`                              | Test helpers (`renderWithApp`, `rideOf`, `canvasRecorder`, ...).                                                                                   |
| `e2e/`                                   | Playwright tests in Chrome against the production build, with an axe-core accessibility audit.                                                     |
| `public/`                                | `sw.js` (service worker, written by hand), the manifest and the icons.                                                                             |
| `src-tauri/`                             | A desktop shell. A starting point only: it has never been built here (no Rust toolchain).                                                          |
| `samples/`, `.agent-generated/`, `dist/` | Git-ignored. Real rides, working notes of agent sessions, and the production build. Never commit them.                                             |

Stack: React 18, Vite 5, TypeScript (strict), Tailwind 4, shadcn/ui, Recharts, Leaflet, `@garmin/fitsdk`, `mp4-muxer` (loaded only when a video is made), Vitest, Playwright.

## Commands

| Command                             | What it does                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Dev server on port 5173 (hot reload).                                                                                                               |
| `npm run typecheck`, `npm run lint` | TypeScript and ESLint. ESLint refuses native `<button>`, `<input>`, `<select>`, `<textarea>`, `<label>` and `<table>` outside `src/components/ui/`. |
| `npm test`                          | Unit and component tests (Vitest, jsdom).                                                                                                           |
| `npm run e2e`                       | Builds, serves the build on port 4173 and runs the Playwright tests (needs Google Chrome; the long ones make real videos and take minutes).         |
| `npm run build`                     | Type check and production build into `dist/`.                                                                                                       |

Before a change is called done: typecheck, lint, all unit tests, and the e2e tests when the change touches something the user sees. Report what failed or was skipped as it is.

## How to change it

- **Tests first.** Write the test, watch it fail for the right reason, then make it pass. Tests use synthetic data only: no real coordinates, names or rides (the fixtures use longitude -30.1 and made-up places). Real rides stay in the ignored `samples/`.
- **Two languages.** Every user-visible text lives in the `messages.ts` of its area, in English and Spanish, and each area is registered in `src/app/messages.ts`. A test checks that both languages have the same keys. Code, comments and identifiers are in English.
- **Only shadcn controls.** Pages use the components of `src/components/ui/`. Under React 18 the generated `Button` does not forward refs, so a Radix trigger must not use `asChild` with it.
- **Privacy is a setting, not a default.** The only network traffic is for map tiles and, for the 3D video, terrain tiles. Both go through `src/lib/tiles.ts` and are chosen in Settings > Map privacy (OpenStreetMap, own server, or nothing). A new kind of request needs its own setting, a row in the privacy table of `README.md` and the sentence of the first-visit introduction (`help.onboarding.privacy.body` in `src/features/settings/messages.ts`).
- **Document what the user can do.** A new command, option or message updates the help text, the translations and `README.md` in the same change.
- **Saved data keeps working.** Settings are in `localStorage` (`src/lib/settingsStorage.ts`) and rides in IndexedDB. Add fields as optional with a default on load; never change the shape of what is already saved. The service worker (`public/sw.js`) keeps map and terrain tiles in one cache of 1500 tiles.
- **Dependencies are a decision.** Adding or upgrading one changes `package.json` and the lock file; say so, and prefer loading it on demand (as `mp4-muxer` is).
- **Working tips.** The 3D video needs WebGL 2 and WebCodecs, which jsdom lacks: the renderer is a thin layer and everything else is pure code with injected dependencies, so it can be tested. Check drawing in a real browser. Do not edit source files while a browser run is in progress: Vite reloads the page and kills the run. On Windows with Git Bash, write long scripts to a file instead of a heredoc, give Node paths with `cygpath -m`, and run Prettier on the files you touched (the checkouts may leave CRLF in the working tree; the repository stores LF).

## How it is versioned

There are two things to version, and both are always done:

### 1. The source: this repository

- Branch `feat/ideas`. History is local: there is no remote for this repository.
- Commit messages follow the git conventions skill of the organisation (`aranda-git-workflow`): Spanish, one short line, no body, no signature or co-author lines. That skill is the source of truth; do not copy its rules here.
- Group the change by area (one commit per area of the app, with its tests), after the checks above pass. No commit and no publication without the owner's go-ahead.
- After a commit, assess it with `gentle-ai review assess --committed-only` as the project's review workflow asks; the owner decides per candidate whether it is reviewed.
- Never commit `dist/`, `samples/`, `.agent-generated/`, `node_modules/` or anything with real positions.

### 2. What is published: the GitHub Pages site

The site `https://ingfabianrodriguez.github.io/` lives in the repository `IngFabianRodriguez/IngFabianRodriguez.github.io` (branch `main`). The project goes there twice:

| Folder in that repository | What it holds                                                                                     | Where it comes from                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `fit-power-lab/`          | The production build (the app that runs at `https://ingfabianrodriguez.github.io/fit-power-lab/`) | `npm run build` (`dist/`, which uses relative addresses so it works in any folder) |
| `fit-power-lab-source/`   | The source code, a mirror of this repository's tracked files                                      | `git ls-files` of this repository                                                  |

To publish (with the owner's go-ahead for that repository, with their `gh` session):

1. Commit the source here first, build from that committed state (`npm run build`), and make sure the checks pass.
2. Make a scratch clone outside the project (`mktemp -d`): `git clone --no-checkout`, then `git config core.protectNTFS false` (only in that clone: the repository has a file name that Windows cannot hold), set the owner's personal GitHub identity there (the one already used by the earlier commits of that repository, never a corporate address), and sparse-checkout only `/fit-power-lab/`, `/fit-power-lab-source/`, `/README.md` and `/index.html`. In Git Bash set `MSYS_NO_PATHCONV=1` for the sparse-checkout command, or the patterns are rewritten.
3. Look at what is there before replacing it: list what the new build and source add, change and remove (the build's files have hashed names, so most of `assets/` is replaced).
4. Replace `fit-power-lab/` with the contents of `dist/`, and copy the tracked files into `fit-power-lab-source/` (for example `git ls-files -z | tar --null -T - -cf - | tar -xf - -C <clone>/fit-power-lab-source`).
5. Scan what is going up for secrets and personal data, then make two commits there, the build first and the source second, each a one-line Spanish message.
6. `git fetch` to see that `main` has not moved (a blog is regenerated there automatically), then push with the owner's session: `git -c credential.helper= -c "credential.helper=!gh auth git-credential" push origin main`.
7. Wait for the Pages build (`gh api repos/IngFabianRodriguez/IngFabianRodriguez.github.io/pages/builds/latest`, status `built`) and check the live site: the files answer, the service worker scope is `/fit-power-lab/`, the console is clean and the only hosts asked are the site, the tile server and the terrain server.
8. Delete the scratch clone.

The link to the app at the end of the home page of that site (`index.html`) and the list in its `README.md` were added once and are left alone.
