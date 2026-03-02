'use strict';

const { Client }          = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked }           = require('marked');
const slugify              = require('slugify');
const fs                   = require('fs');
const path                 = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const NOTION_TOKEN  = process.env.NOTION_TOKEN;
const DATABASE_ID   = '2d99db1ddb0d805ea966d1dcab8df32b';
const BLOG_DIR      = path.resolve(__dirname, '..', '365daysofai');

if (!NOTION_TOKEN) {
  console.error('❌  NOTION_TOKEN environment variable not set');
  process.exit(1);
}

// ── Notion clients ────────────────────────────────────────────────────────────
const notion = new Client({ auth: NOTION_TOKEN });
const n2m    = new NotionToMarkdown({ notionClient: notion });

marked.setOptions({ gfm: true, breaks: false });

// Protege bloques de math antes de que marked los procese.
// notion-to-md genera $$\n...\n$$ y marked con breaks:true metía <br> adentro.
function protectMath(md) {
  const placeholders = [];
  // Bloques $$...$$
  let out = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    const idx = placeholders.length;
    placeholders.push(`$$${inner.trim()}$$`);
    return `MATHBLOCK_${idx}_END`;
  });
  // Inline $...$
  out = out.replace(/\$([^\n$]+?)\$/g, (_, inner) => {
    const idx = placeholders.length;
    placeholders.push(`$${inner}$`);
    return `MATHINLINE_${idx}_END`;
  });
  return { out, placeholders };
}

function restoreMath(html, placeholders) {
  html = html.replace(/MATHBLOCK_(\d+)_END/g, (_, i) => placeholders[i]);
  html = html.replace(/MATHINLINE_(\d+)_END/g, (_, i) => placeholders[i]);
  return html;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeSlug(title) {
  return slugify(title, { lower: true, strict: true, locale: 'es' })
    .slice(0, 60)
    .replace(/-+$/, '');
}

function dayNum(title) {
  // Acepta "Día", "Dia", "día", "dia" (con o sin acento)
  const m = title.match(/[Dd][ií]a\s+(\d+)/);
  return m ? m[1] : null;
}

// Día N del reto = 1 enero 2026 + (N-1) días
function dayToDate(n) {
  const d = new Date('2026-01-01T00:00:00');
  d.setDate(d.getDate() + (parseInt(n, 10) - 1));
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Devuelve fecha ISO YYYY-MM-DD para usar en data-pubdate
function pubIso(n) {
  const d = new Date('2026-01-01T00:00:00');
  d.setDate(d.getDate() + (parseInt(n, 10) - 1));
  return d.toISOString().slice(0, 10);
}

function shortTitle(title) {
  // "Día 70/365: MLP - subtítulo" → "MLP - subtítulo"
  const m = title.match(/:\s*(.+)/);
  return m ? m[1].trim() : title;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function techTags(tech) {
  if (!tech) return '';
  return tech.split(',')
    .map(t => `<span class="tag">${escHtml(t.trim())}</span>`)
    .join('');
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ── Query all pages from the database ────────────────────────────────────────
async function getArticles() {
  const all = [];
  let cursor;

  do {
    const r = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [{ property: 'Articulo', direction: 'ascending' }],
      ...(cursor && { start_cursor: cursor }),
    });

    for (const page of r.results) {
      const title = page.properties.Articulo?.title?.[0]?.plain_text ?? '';
      const tech  = page.properties.Tecnologia?.rich_text?.[0]?.plain_text ?? '';
      if (!title) continue;

      all.push({
        id:      page.id,
        title,
        tech,
        created: page.created_time,
        slug:    makeSlug(title),
      });
    }

    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  return all;
}

// ── Convert Notion page to HTML ───────────────────────────────────────────────
async function pageToHtml(pageId) {
  const blocks   = await n2m.pageToMarkdown(pageId);
  const mdResult = n2m.toMarkdownString(blocks);
  const md       = typeof mdResult === 'object' ? (mdResult.parent ?? '') : mdResult;
  const { out, placeholders } = protectMath(md);
  const rawHtml = marked.parse(out);
  return restoreMath(rawHtml, placeholders);
}

// ── Shared CSS ────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0a192f; --bg-card: #112240; --border: #233554;
  --text-muted: #8892b0; --text: #a8b2d8; --text-heading: #ccd6f6;
  --accent: #64ffda; --accent-tint: rgba(100,255,218,0.08); --accent-tint2: rgba(100,255,218,0.18);
  --shadow: rgba(2,12,27,0.7); --nav-bg: rgba(10,25,47,0.92); --mob-bg: rgba(10,25,47,0.98);
}
[data-theme="light"] {
  --bg: #f0f4fb; --bg-card: #ffffff; --border: #d4dcee;
  --text-muted: #64748b; --text: #475569; --text-heading: #0f172a;
  --accent: #0d9488; --accent-tint: rgba(13,148,136,0.08); --accent-tint2: rgba(13,148,136,0.18);
  --shadow: rgba(15,23,42,0.12); --nav-bg: rgba(240,244,251,0.95); --mob-bg: rgba(240,244,251,0.99);
}

body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; min-height: 100vh; }

/* ── Navbar ── */
nav {
  position: sticky; top: 0; z-index: 1000;
  background: var(--nav-bg); backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  padding: 0 3rem; height: 70px;
  display: flex; align-items: center; justify-content: space-between;
}
.nav-logo {
  font-family: 'Fira Code', monospace; color: var(--accent);
  font-size: 1.2rem; font-weight: 500; text-decoration: none;
}
.nav-links { display: flex; gap: 1.5rem; list-style: none; align-items: center; }
.nav-links a {
  color: var(--text-heading); text-decoration: none;
  font-family: 'Fira Code', monospace; font-size: .82rem; transition: color .2s;
}
.nav-links a:hover, .nav-links a.active { color: var(--accent); }
.nav-actions { display: flex; align-items: center; gap: 14px; }
.theme-toggle {
  background: var(--accent-tint); border: 1px solid var(--accent); color: var(--accent);
  border-radius: 50%; width: 34px; height: 34px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: .85rem; transition: all .2s; flex-shrink: 0;
}
.theme-toggle:hover { background: var(--accent-tint2); transform: rotate(22deg) scale(1.1); }
.hamburger {
  display: none; flex-direction: column; gap: 5px;
  cursor: pointer; padding: 4px; background: none; border: none;
}
.hamburger span { display: block; width: 24px; height: 2px; background: var(--accent); border-radius: 2px; transition: all .25s; }
.hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.mobile-nav {
  display: none; position: fixed; inset: 0; z-index: 999;
  background: var(--mob-bg); backdrop-filter: blur(18px);
  flex-direction: column; align-items: center; justify-content: center; gap: 36px;
}
.mobile-nav.open { display: flex; }
.mobile-nav a {
  font-family: 'Fira Code', monospace; font-size: 1.1rem;
  color: var(--text-heading); text-decoration: none; transition: color .2s;
}
.mobile-nav a:hover, .mobile-nav a.active { color: var(--accent); }

/* ── Tags ── */
.tag {
  display: inline-block; font-family: 'Fira Code', monospace; font-size: .75rem;
  color: var(--accent); background: var(--accent-tint);
  border: 1px solid var(--accent); border-radius: 4px; padding: 2px 8px;
}

/* ── Blog index ── */
.blog-hero { text-align: center; padding: 4rem 1.5rem 2.5rem; }
.blog-hero h1 { color: var(--text-heading); font-size: clamp(1.8rem, 5vw, 2.8rem); margin-bottom: .75rem; }
.blog-hero p { color: var(--text-muted); max-width: 520px; margin: 0 auto 1.25rem; }
.blog-count { font-family: 'Fira Code', monospace; color: var(--accent); font-size: .9rem; }

.articles-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem; max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 5rem;
}
.article-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 10px; padding: 1.5rem; text-decoration: none; display: block;
  transition: transform .2s, border-color .2s;
}
.article-card:hover { transform: translateY(-3px); border-color: var(--accent); }
.article-card .day-badge { font-family: 'Fira Code', monospace; font-size: .8rem; color: var(--accent); display: block; margin-bottom: .5rem; }
.article-card h3 { color: var(--text-heading); font-size: .93rem; line-height: 1.4; margin-bottom: .75rem; }
.article-card .tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; }
.article-card time { color: var(--text-muted); font-size: .78rem; }

/* ── Article page ── */
.article-hero { padding: 3rem 1.5rem 2rem; max-width: 820px; margin: 0 auto; }
.day-badge { display: inline-block; font-family: 'Fira Code', monospace; font-size: .85rem; color: var(--accent); margin-bottom: 1rem; }
.article-title { color: var(--text-heading); font-size: clamp(1.3rem, 4vw, 2rem); line-height: 1.35; margin-bottom: 1.2rem; }
.article-meta { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }
.article-date { color: var(--text-muted); font-size: .85rem; }

.article-body { max-width: 820px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
.article-body h2 { color: var(--text-heading); font-size: 1.3rem; margin: 2.5rem 0 1rem; padding-bottom: .4rem; border-bottom: 1px solid var(--border); }
.article-body h3 { color: var(--text-heading); font-size: 1.1rem; margin: 2rem 0 .75rem; }
.article-body h4 { color: var(--text-heading); font-size: 1rem; margin: 1.5rem 0 .5rem; }
.article-body p { margin-bottom: 1.2rem; }
.article-body ul, .article-body ol { padding-left: 1.5rem; margin-bottom: 1.2rem; }
.article-body li { margin-bottom: .4rem; }
.article-body strong { color: var(--text-heading); }
.article-body hr { border: none; border-top: 1px solid var(--border); margin: 2.5rem 0; }
.article-body a { color: var(--accent); }
.article-body blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; color: var(--text-muted); font-style: italic; margin: 1.5rem 0; }
.article-body pre {
  background: #0d1117; border: 1px solid var(--border); border-radius: 8px;
  padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0;
  font-family: 'Fira Code', monospace; font-size: .85rem; line-height: 1.6;
}
.article-body code {
  font-family: 'Fira Code', monospace; font-size: .85em;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 4px; padding: .15em .4em;
}
.article-body pre code { background: none; border: none; padding: 0; font-size: inherit; }
.article-body table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: .9rem; }
.article-body th, .article-body td { border: 1px solid var(--border); padding: .6rem 1rem; text-align: left; }
.article-body th { background: var(--bg-card); color: var(--text-heading); }
.article-body .katex-display { overflow-x: auto; padding: .5rem 0; }

.article-nav {
  max-width: 820px; margin: 0 auto; padding: 2rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
}
.article-nav a { color: var(--accent); text-decoration: none; font-size: .85rem; font-family: 'Fira Code', monospace; }
.article-nav a:hover { text-decoration: underline; }

@media (max-width: 900px) {
  nav { padding: 0 1.5rem; }
  .nav-links { display: none; }
  .hamburger { display: flex; }
}
@media (max-width: 640px) {
  .articles-grid { grid-template-columns: 1fr; padding-left: 1rem; padding-right: 1rem; }
  .article-hero, .article-body { padding-left: 1rem; padding-right: 1rem; }
}
`;

// ── Shared theme JS ───────────────────────────────────────────────────────────
const THEME_JS = `
  const _html = document.documentElement;
  const _btn  = document.getElementById('themeToggle');
  const _icon = document.getElementById('themeIcon');
  function _setIcon(t) { _icon.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon'; }
  const _saved = localStorage.getItem('theme') || 'dark';
  _html.setAttribute('data-theme', _saved);
  _setIcon(_saved);
  _btn.addEventListener('click', () => {
    const next = _html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    _html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    _setIcon(next);
  });
  // Hamburger mobile nav
  const _hbg = document.getElementById('hamburger');
  const _mob = document.getElementById('mobileNav');
  if (_hbg && _mob) {
    _hbg.addEventListener('click', () => {
      _hbg.classList.toggle('open');
      _mob.classList.toggle('open');
    });
    _mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      _hbg.classList.remove('open');
      _mob.classList.remove('open');
    }));
  }
`;

const CDN_FONTS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
`;

// ── Article page template ─────────────────────────────────────────────────────
function articlePage(article, bodyHtml, prev, next) {
  const day   = dayNum(article.title) ?? '?';
  const pub   = day !== '?' ? pubIso(day) : null;
  const short = shortTitle(article.title);
  const title = escHtml(short);

  const prevDay = prev ? (dayNum(prev.title) ?? '?') : null;
  const nextDay = next ? (dayNum(next.title) ?? '?') : null;
  const prevLink = prev
    ? `<a href="/365daysofai/${prev.slug}/">← Día ${prevDay}</a>`
    : '<span></span>';
  const nextLink = next
    ? `<a href="/365daysofai/${next.slug}/">Día ${nextDay} →</a>`
    : '<span></span>';

  return `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${title} | #365DaysOfAI por Fabián Rodríguez">
  <title>${title} | #365DaysOfAI</title>
  ${CDN_FONTS}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>${CSS}</style>
</head>
<body>
  <nav>
    <a class="nav-logo" href="/">&lt;HFR /&gt;</a>
    <ul class="nav-links">
      <li><a href="/">Portfolio</a></li>
      <li><a href="/365daysofai/" class="active">#365DaysOfAI</a></li>
    </ul>
    <div class="nav-actions">
      <button class="theme-toggle" id="themeToggle" aria-label="Cambiar tema">
        <i class="fas fa-sun" id="themeIcon"></i>
      </button>
      <button class="hamburger" id="hamburger" aria-label="Menú">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
  <div class="mobile-nav" id="mobileNav">
    <a href="/">Portfolio</a>
    <a href="/365daysofai/" class="active">#365DaysOfAI</a>
  </div>

  <header class="article-hero">
    <div class="day-badge">Día ${day} / 365 &nbsp;·&nbsp; #365DaysOfAI</div>
    <h1 class="article-title">${title}</h1>
    <div class="article-meta">
      <time class="article-date">${day ? dayToDate(day) : fmtDate(article.created)}</time>
      ${article.tech ? `<div class="tags">${techTags(article.tech)}</div>` : ''}
    </div>
  </header>

  <article class="article-body">
    ${bodyHtml}
  </article>

  <nav class="article-nav" aria-label="Navegación entre artículos">
    ${prevLink}
    <a href="/365daysofai/">↑ Todos los artículos</a>
    ${nextLink}
  </nav>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <script>
    hljs.highlightAll();
    document.addEventListener('DOMContentLoaded', () => {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$',  right: '$',  display: false },
          { left: '\\\\[', right: '\\\\]', display: true },
          { left: '\\\\(', right: '\\\\)', display: false },
        ],
        throwOnError: false,
      });
    });
    ${THEME_JS}
    // Proteger artículo futuro si alguien entra directo por URL
    (function() {
      var pub = ${pub ? `"${pub}"` : 'null'};
      if (!pub) return;
      var d = new Date();
      var todayStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      if (pub > todayStr) {
        document.querySelector('.article-body').innerHTML =
          '<div style="text-align:center;padding:4rem 1rem"><p style="font-family:var(--accent-tint);font-size:3rem">🔒</p>' +
          '<h2 style="color:var(--text-heading);margin:.75rem 0">Aún no disponible</h2>' +
          '<p style="color:var(--text-muted)">Este artículo se publica el <strong style="color:var(--accent)">${pub ? dayToDate(day) : ''}</strong></p>' +
          '<a href="/365daysofai/" style="display:inline-block;margin-top:1.5rem;color:var(--accent)">← Ver artículos disponibles</a></div>';
      }
    })();
  </script>
</body>
</html>`;
}

// ── Blog index template ───────────────────────────────────────────────────────
function indexPage(articles) {
  const cards = articles.map(a => {
    const day   = dayNum(a.title) ?? '?';
    const short = escHtml(shortTitle(a.title));
    const pub   = day !== '?' ? pubIso(day) : '';
    return `
    <a class="article-card" href="/365daysofai/${a.slug}/" ${pub ? `data-pubdate="${pub}"` : ''}>
      <span class="day-badge">Día ${day} / 365</span>
      <h3>${short}</h3>
      ${a.tech ? `<div class="tags">${techTags(a.tech)}</div>` : ''}
      <time>${day !== '?' ? dayToDate(day) : fmtDate(a.created)}</time>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="365 días aprendiendo y compartiendo sobre Inteligencia Artificial — por Fabián Rodríguez">
  <title>#365DaysOfAI | Fabián Rodríguez</title>
  ${CDN_FONTS}
  <style>${CSS}</style>
</head>
<body>
  <nav>
    <a class="nav-logo" href="/">&lt;HFR /&gt;</a>
    <ul class="nav-links">
      <li><a href="/">Portfolio</a></li>
      <li><a href="/365daysofai/" class="active">#365DaysOfAI</a></li>
    </ul>
    <div class="nav-actions">
      <button class="theme-toggle" id="themeToggle" aria-label="Cambiar tema">
        <i class="fas fa-sun" id="themeIcon"></i>
      </button>
      <button class="hamburger" id="hamburger" aria-label="Menú">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
  <div class="mobile-nav" id="mobileNav">
    <a href="/">Portfolio</a>
    <a href="/365daysofai/" class="active">#365DaysOfAI</a>
  </div>

  <header class="blog-hero">
    <h1>#365DaysOfAI</h1>
    <p>365 días aprendiendo, construyendo y compartiendo sobre Inteligencia Artificial</p>
    <span class="blog-count">${articles.length} artículos publicados</span>
  </header>

  <main class="articles-grid">
    ${cards}
  </main>

  <script>
    ${THEME_JS}
    // Ocultar artículos futuros según la fecha local del navegador (sin conversión UTC)
    (function() {
      var d = new Date();
      var todayStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      document.querySelectorAll('.article-card[data-pubdate]').forEach(function(card) {
        if (card.dataset.pubdate > todayStr) card.style.display = 'none';
      });
    })();
  </script>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📚 Fetching articles from Notion...');
  const articles = await getArticles();
  console.log(`   Found ${articles.length} articles\n`);

  ensureDir(BLOG_DIR);

  // Generate index
  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexPage(articles), 'utf8');
  console.log('✅ Generated blog/index.html');

  // Generate each article page
  let ok = 0, fail = 0;
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const prev    = articles[i - 1] ?? null;
    const next    = articles[i + 1] ?? null;

    process.stdout.write(`   [${String(i + 1).padStart(3)}/${articles.length}] ${article.title.slice(0, 55)}...`);

    try {
      const bodyHtml = await pageToHtml(article.id);
      const html     = articlePage(article, bodyHtml, prev, next);

      const dir = path.join(BLOG_DIR, article.slug);
      ensureDir(dir);
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');

      console.log(' ✓');
      ok++;
    } catch (err) {
      console.log(` ❌ ${err.message}`);
      fail++;
    }

    // Respect Notion rate limit (3 req/s)
    await new Promise(r => setTimeout(r, 400));
  }

  const today = new Date().toISOString().slice(0, 10);
  const manifest = articles
    .map(a => {
      const day = dayNum(a.title);
      const pubdate = day ? pubIso(day) : null;
      const tech = a.tech
        ? a.tech.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      return { ...a, day, pubdate, tech };
    })
    .filter(a => a.pubdate && a.pubdate <= today)
    .sort((a, b) => b.pubdate.localeCompare(a.pubdate))
    .slice(0, 20)
    .map(a => ({
      slug: a.slug,
      title: a.title,
      day: a.day,
      pubdate: a.pubdate,
      tech: a.tech,
    }));
  fs.writeFileSync(path.join(BLOG_DIR, 'articles.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n🎉 Done! ${ok} generated, ${fail} failed.`);
  console.log('   Blog available at: /365daysofai/');
}

main().catch(err => { console.error(err); process.exit(1); });
