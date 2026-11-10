# IngFabianRodriguez.github.io

Personal site for Hector Fabian Rodriguez — CV, portfolio, demos, and the 365DaysOfAI blog.

## Sections

- [Home](/) — landing & unified navigation
- [CV](/CV/) — resume / hoja de vida
- [Hoja de vida (v2)](/Hoja-de-vida/) — alternate CV layout
- [Portafolio](/portafolio/) — projects showcase
- [Scrum Backlog](/backlog/) — Apple Design dark premium SPA
- [Simon Dice](/Simon-dice/) — interactive memory game
- [Google Clone](/google-clone/) — semantic HTML/CSS practice
- [FIT Power Lab](/fit-power-lab/) — estimates cycling power from `.fit` files, in the browser
  - Source code: [`fit-power-lab-source/`](https://github.com/IngFabianRodriguez/IngFabianRodriguez.github.io/tree/main/fit-power-lab-source)
- [Blog 365DaysOfAI](/blog/) — one AI article per day

## Branches

- `main` — production (Pages source)
- `archive/parqueaderos-specs` — historical branch holding unrelated SaaS specs

## Stack

Pure HTML/CSS/JS. No build tooling. GitHub Pages managed deploy.

Exception: `fit-power-lab/` holds the production build of a React + Vite app, published as static files. Its source code is in `fit-power-lab-source/`; everything the app does runs in the visitor's browser.