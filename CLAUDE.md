# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio CV for **Héctor Fabián Rodríguez Acosta** — deployed via GitHub Pages at `IngFabianRodriguez.github.io`. Single-file static site: all HTML, CSS, and JS live in `index.html`. No build step, no framework, no dependencies to install.

## Development

Open `index.html` directly in a browser — no server needed. To preview locally with live reload:

```bash
npx live-server .
```

Deploy by pushing to `main` on GitHub; GitHub Pages serves automatically.

## Architecture

Everything is in `index.html`:

### Theme System (CSS Custom Properties)
Dual dark/light theme via CSS tokens on `:root` (dark default) and `[data-theme="light"]` override:

```css
:root {
  --bg: #0a192f;  --bg-card: #112240;  --border: #233554;
  --text-muted: #8892b0;  --text: #a8b2d8;  --text-heading: #ccd6f6;
  --accent: #64ffda;  --accent-tint: rgba(100,255,218,0.08);
  --shadow: rgba(2,12,27,0.7);  --nav-bg: rgba(10,25,47,0.92);
}
[data-theme="light"] {
  --bg: #f0f4fb;  --bg-card: #ffffff;  --border: #d4dcee;
  --text-muted: #64748b;  --text: #475569;  --text-heading: #0f172a;
  --accent: #0d9488;  --shadow: rgba(15,23,42,0.12);
}
```

**Never use hardcoded colors** — always reference a CSS token. Toggle is persisted via `localStorage('theme')`.

### Navbar / Theme Toggle
Single `.nav-actions` div holds **both** the theme button and hamburger — do NOT split them:

```html
<ul class="nav-links"><!-- 6 anchor links only --></ul>
<div class="nav-actions">
  <button class="theme-toggle" id="themeToggle"><i class="fas fa-sun" id="themeIcon"></i></button>
  <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
</div>
```

Hamburger opens a fullscreen `.mobile-overlay` and is hidden on desktop (`display:none` above 900px).

### Sections (in order)
`#hero` → `#about` → `#experience` → `#education` → `#skills` → `#certs` → `#contact`

### Responsive Breakpoints
| Breakpoint | Changes |
|-----------|---------|
| `≤ 900px` | Hamburger menu, hide sidebars |
| `≤ 640px` | Single-column grids, smaller hero |
| `≤ 400px` | Micro font adjustments |

### Tab system (Experience)
`switchTab(btn, id)` toggles `.active` on `.tab-btn` and `.tab-panel`. Current tabs: `#t1`–`#t6`.

- t1: Colmédica / Médicos Para Colombia
- t2: Sefar Universe
- t3: Aseguradora Solidaria
- t4: Tráfico Bogotá
- t5: Telefónica Colombia
- t6: Arus Tecnología / C.C. UNILAGO / Enel Colombia

To add a new tab: create button + panel with next ID (`t7`), add `onclick="switchTab(this,'t7')"`.

### Scroll reveal
`IntersectionObserver` adds `.visible` to elements with class `.reveal` when they enter the viewport.

### Fixed sidebars
`.sidebar-left` (social icons) and `.sidebar-right` (email vertical text) — hidden on mobile via `@media (max-width: 900px)`.

## Content Structure

| Section | Key classes/IDs | Notes |
|---------|----------------|-------|
| Experience | `.tab-btn`, `.tab-panel`, `#t1–t6` | Add button + panel pair |
| Education | `.edu-card` inside `.edu-grid` | 7 cards; use `.nota` for GPA, `.edu-project` for thesis |
| Skills | `.skill-card` inside `.skills-grid` | Copy card block |
| Certifications | `.cert-card` inside `.cert-grid` | 5 thematic cards with internal scroll (`max-height:260px`) |
| Achievements | `.ach-card` inside `.ach-grid` | 7 cards |

### Cert card categories (in order)
1. Cloud & DevOps
2. IA Generativa & Agentes
3. Python & Backend
4. Data Science & BI
5. Agilidad & Gestión

### New section pattern
```html
<section id="name">
  <div class="section-wrap">
    <h2 class="section-title reveal"><span class="num">NN.</span> Título</h2>
    <!-- content -->
  </div>
</section>
```
And add a nav link in `#navbar`.

## Key JS Functions

| Function | Purpose |
|----------|---------|
| `switchTab(btn, id)` | Experience tab switching |
| `toggleTheme()` | Dark↔light with `localStorage` |
| `setIcon(theme)` | Updates `#themeIcon` class |
| Hamburger listeners | Toggle `.open` on `#hamburger` + `.mobile-overlay` |
| `IntersectionObserver` | Scroll reveal for `.reveal` elements |

## External Dependencies (CDN)

- Google Fonts: Inter + Fira Code
- Font Awesome 6.5.0 (icons)

## Versioning

| Tag | Description |
|-----|-------------|
| v1.0.0 | Initial portfolio with full LinkedIn content |
| v1.1.0 | Responsive redesign + dark/light theme toggle |
