# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio CV for **Héctor Fabián Rodríguez Acosta** — deployed via GitHub Pages at `IngFabianRodriguez.github.io`. The repo has two parts:

1. **`index.html`** — single-file portfolio (HTML + CSS + JS, no build step)
2. **`blog/`** — static blog auto-generated from Notion (#365DaysOfAI series)

## Development

```bash
# Portfolio: open directly in browser
npx live-server .

# Blog: sync articles from Notion
export NOTION_TOKEN="your_token"
bash sync-blog.sh
```

Deploy by pushing to `main`; GitHub Pages serves automatically.

## Portfolio (`index.html`)

### Theme System (CSS Custom Properties)
Dual dark/light theme via `:root` (dark default) and `[data-theme="light"]` override:

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

**Never use hardcoded colors.** Toggle persisted via `localStorage('theme')`.

### Navbar
Single `.nav-actions` div holds theme toggle + hamburger — do NOT split them:

```html
<ul class="nav-links"><!-- 6 anchor links only --></ul>
<div class="nav-actions">
  <button class="theme-toggle" id="themeToggle"><i class="fas fa-sun" id="themeIcon"></i></button>
  <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
</div>
```

### Sections (in order)
`#hero` → `#about` → `#experience` → `#education` → `#skills` → `#certs` → `#contact`

### Responsive Breakpoints
| Breakpoint | Changes |
|-----------|---------|
| `≤ 900px` | Hamburger menu, hide sidebars |
| `≤ 640px` | Single-column grids, smaller hero |
| `≤ 400px` | Micro font adjustments |

### Tab system (Experience)
`switchTab(btn, id)` — current tabs `#t1`–`#t6`:
- t1: Colmédica / Médicos Para Colombia · t2: Sefar Universe · t3: Aseguradora Solidaria
- t4: Tráfico Bogotá · t5: Telefónica Colombia · t6: Arus Tecnología / C.C. UNILAGO / Enel Colombia

Next tab: `t7` with `onclick="switchTab(this,'t7')"`.

### Content structure
| Section | Key classes | Notes |
|---------|------------|-------|
| Experience | `.tab-btn`, `.tab-panel`, `#t1–t6` | Button + panel pair |
| Education | `.edu-card` in `.edu-grid` | 7 cards; `.nota` = GPA, `.edu-project` = thesis |
| Skills | `.skill-card` in `.skills-grid` | |
| Certifications | `.cert-card` in `.cert-grid` | 5 scrollable thematic cards |
| Achievements | `.ach-card` in `.ach-grid` | 7 cards |

### Key JS functions
| Function | Purpose |
|----------|---------|
| `switchTab(btn, id)` | Experience tab switching |
| `toggleTheme()` | Dark↔light + `localStorage` |
| `setIcon(theme)` | Updates `#themeIcon` class |
| Hamburger listeners | Toggle `.open` on overlay |
| `IntersectionObserver` | Scroll reveal for `.reveal` elements |

---

## Blog (`blog/` + `scripts/`)

### Architecture
```
Notion DB "Publicaciones" → scripts/generate-blog.js → blog/slug/index.html
```

### Notion Database
- **ID**: `2d99db1ddb0d805ea966d1dcab8df32b`
- **Fields**: `Articulo` (title), `Tecnologia` (text)
- **Content**: full article body inside each page

### Publication date logic
Day N of the challenge = `2026-01-01 + (N-1) days`. Day 1 → Jan 1 2026, Day 365 → Dec 31 2026.

Titles may be `"Día N/365: ..."` or `"Dia N/365: ..."` (accent optional) — regex: `/[Dd][ií]a\s+(\d+)/`.

### Client-side date filtering (no server needed)
Articles are all generated. The browser hides/shows them:

```js
// Index page: hide future cards
var d = new Date();
var todayStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
card.dataset.pubdate > todayStr → card.style.display = 'none'

// Article page: show locked screen if visited directly
pub > todayStr → show "Aún no disponible" overlay
```

**Date comparison uses browser local date (not UTC)** to avoid timezone issues (Colombia = UTC-5).

### Math & code rendering
- **KaTeX** (CDN): renders `$...$` inline and `$$...$$` block equations
- **highlight.js** (CDN): syntax highlights fenced code blocks
- `protectMath()` in the script extracts math before `marked` processes it (prevents `<br>` injection inside LaTeX)

### Syncing from Notion
```bash
# Requires NOTION_TOKEN in environment (already in ~/.bashrc)
bash sync-blog.sh
```

The script: fetches all pages → converts to HTML → commits changed files → pushes.

### File structure
```
blog/
├── index.html                  → /blog/
└── dia-N-slug/
    └── index.html              → /blog/dia-N-slug/
scripts/
├── generate-blog.js            # main generator
└── package.json                # @notionhq/client, notion-to-md, marked, slugify
sync-blog.sh                    # one-command sync script
```

---

## External Dependencies (CDN)
- Google Fonts: Inter + Fira Code
- Font Awesome 6.5.0
- highlight.js 11.9.0 (blog only)
- KaTeX 0.16.9 (blog only)

## Versioning
| Tag | Description |
|-----|-------------|
| v1.0.0 | Initial portfolio with full LinkedIn content |
| v1.1.0 | Responsive redesign + dark/light theme toggle |
| v1.1.1 | CLAUDE.md updated |
| v1.2.0 | #365DaysOfAI blog synced from Notion |
