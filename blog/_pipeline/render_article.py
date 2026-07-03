"""
Generate blog HTML from a Markdown article body + metadata.

Usage:
    python render_article.py --day 113 --input article.md --output blog/dia-113365-ocr/index.html

The Markdown file is expected to be the raw output of the master prompt:
    ### METADATA
    Articulo: Dia 113/365: <title>
    Tecnologia: <stack>
    Modo: <A|B|C|D|E>

    ### ARTICULO
    <markdown body — starts with H2 "Introduccion" or similar>

The script:
  1. Parses the METADATA block
  2. Renders the ARTICULO block as Markdown to HTML inside <article class="article-body">
  3. Wraps the result in the blog's HTML skeleton (same as existing articles)
  4. Computes prev/next links based on day
  5. Writes to the output path
"""

from __future__ import annotations
import argparse
import datetime
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent))
from days_table import DAYS, build_path, get_mode, get_date  # type: ignore


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BLOG_DIR = Path(__file__).resolve().parent.parent  # blog/

SPANISH_MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


# ---------------------------------------------------------------------------
# Markdown to HTML (subset, focused on what the master prompt uses)
# ---------------------------------------------------------------------------

def md_to_html(md: str) -> str:
    """Convert a subset of Markdown to HTML.

    Supports:
      - # H1, ## H2, ### H3, #### H4
      - **bold** and *italic*
      - `inline code`
      - ```language ... ``` fenced code blocks (output as <pre><code>)
      - > blockquote
      - Ordered and unordered lists
      - Tables (GitHub-style pipe tables)
      - $`...`$ inline math and $$...$$ block math (kept as-is for KaTeX)
      - Blank-line-separated paragraphs
      - <hr>
    """
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    in_code = False
    code_lang = ""
    code_buf: list[str] = []

    def flush_code() -> None:
        nonlocal code_lang, code_buf
        if code_buf or code_lang:
            lang = code_lang or "text"
            inner = "\n".join(code_buf)
            escaped = (inner.replace("&", "&amp;")
                            .replace("<", "&lt;")
                            .replace(">", "&gt;"))
            out.append(f'<pre><code class="language-{lang}">{escaped}</code></pre>')
        code_lang = ""
        code_buf = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Code fences
        if stripped.startswith("```"):
            if in_code:
                in_code = False
                flush_code()
            else:
                in_code = True
                code_lang = stripped[3:].strip() or "text"
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # Math blocks ($$...$$)
        if stripped == "$$":
            # gather until next $$
            block = []
            i += 1
            while i < len(lines) and lines[i].strip() != "$$":
                block.append(lines[i])
                i += 1
            i += 1  # skip closing $$
            out.append("$$\n" + "\n".join(block) + "\n$$")
            continue
        if stripped.startswith("$$") and stripped.endswith("$$") and len(stripped) > 4:
            # single-line math block
            out.append(stripped)
            i += 1
            continue

        # Headings
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            text = inline_md(m.group(2).strip())
            out.append(f"<h{level}>{text}</h{level}>")
            i += 1
            continue

        # Horizontal rule
        if re.match(r"^(\s*[-*_]){3,}\s*$", line):
            out.append("<hr>")
            i += 1
            continue

        # Blockquote
        if stripped.startswith(">"):
            # gather all consecutive > lines
            block = []
            while i < len(lines) and lines[i].lstrip().startswith(">"):
                block.append(re.sub(r"^>\s?", "", lines[i].lstrip()))
                i += 1
            inner = inline_md(" ".join(block))
            out.append(f"<blockquote>{inner}</blockquote>")
            continue

        # Table (GitHub-style)
        if "|" in stripped and i + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-+:?(\s*\|\s*:?-+:?)+\s*\|?\s*$", lines[i + 1]):
            # parse header
            header_cells = [c.strip() for c in stripped.strip("|").split("|")]
            i += 2  # skip header and separator
            rows = []
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                row_cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                rows.append(row_cells)
                i += 1
            table_html = '<table>\n<thead>\n<tr>\n'
            for h in header_cells:
                table_html += f"  <th>{inline_md(h)}</th>\n"
            table_html += "</tr>\n</thead>\n<tbody>\n"
            for row in rows:
                table_html += "<tr>\n"
                for cell in row:
                    table_html += f"  <td>{inline_md(cell)}</td>\n"
                table_html += "</tr>\n"
            table_html += "</tbody>\n</table>"
            out.append(table_html)
            continue

        # Unordered list
        if re.match(r"^[-*]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i]):
                item = re.sub(r"^[-*]\s+", "", lines[i])
                items.append(item)
                i += 1
            out.append("<ul>")
            for item in items:
                # Allow nested indent (2 spaces) as <ul><li>...</li></ul>
                out.append(f"  <li>{inline_md(item.strip())}</li>")
            out.append("</ul>")
            continue

        # Ordered list
        if re.match(r"^\d+\.\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i]):
                item = re.sub(r"^\d+\.\s+", "", lines[i])
                items.append(item)
                i += 1
            out.append("<ol>")
            for item in items:
                out.append(f"  <li>{inline_md(item.strip())}</li>")
            out.append("</ol>")
            continue

        # Blank line
        if not stripped:
            i += 1
            continue

        # Paragraph (gather consecutive non-blank, non-special lines)
        para = [line]
        i += 1
        while i < len(lines):
            nxt = lines[i]
            nxt_stripped = nxt.strip()
            if not nxt_stripped:
                break
            if (nxt_stripped.startswith(("#", ">", "-", "*", "```", "$"))
                or re.match(r"^\d+\.\s+", nxt)
                or "|" in nxt_stripped and i + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-+", lines[i + 1])
                or re.match(r"^(\s*[-*_]){3,}\s*$", nxt)):
                break
            para.append(nxt)
            i += 1
        text = " ".join(p.strip() for p in para)
        out.append(f"<p>{inline_md(text)}</p>")

    flush_code()
    return "\n".join(out)


def inline_md(text: str) -> str:
    """Apply inline Markdown transformations: bold, italic, code, math, links."""
    # Escape HTML but preserve backticks, $, etc.
    # Order matters: code first (preserve content), then math, then bold/italic.
    out = text

    # Inline code: `code`
    def _code_repl(m: re.Match) -> str:
        return f"<code>{m.group(1)}</code>"
    out = re.sub(r"`([^`]+)`", _code_repl, out)

    # Block math tokens ($$...$$) — pass through as-is
    # Inline math ($`...`$) — convert to $...$ for KaTeX (no backticks)
    def _math_inline(m: re.Match) -> str:
        return "$" + m.group(1) + "$"
    out = re.sub(r"\$`([^`]+)`\$", _math_inline, out)

    # Bold: **text**
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    # Italic: *text* or _text_
    out = re.sub(r"(?<![*_])\*([^*]+)\*(?![*])", r"<em>\1</em>", out)

    return out


# ---------------------------------------------------------------------------
# Skeleton template
# ---------------------------------------------------------------------------

# CSS block as a separate string to avoid .format() conflicts with {} in CSS.
HTML_HEAD_CSS = """*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0a192f; --bg-card: #112240; --border: #233554;
  --text-muted: #8892b0; --text: #a8b2d8; --text-heading: #ccd6f6;
  --accent: #64ffda; --accent-tint: rgba(100,255,218,0.08);
  --shadow: rgba(2,12,27,0.7); --nav-bg: rgba(10,25,47,0.92);
}
[data-theme="light"] {
  --bg: #f0f4fb; --bg-card: #ffffff; --border: #d4ddee;
  --text-muted: #64748b; --text: #475569; --text-heading: #0f172a;
  --accent: #0d9488; --accent-tint: rgba(13,148,136,0.08);
  --shadow: rgba(15,23,42,0.12); --nav-bg: rgba(240,244,251,0.95);
}

body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; min-height: 100vh; }

nav {
  position: sticky; top: 0; z-index: 100;
  background: var(--nav-bg); backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  padding: 0 2rem; height: 60px;
  display: flex; align-items: center; justify-content: space-between;
}
.nav-logo { font-family: 'Fira Code', monospace; color: var(--accent); font-size: .9rem; text-decoration: none; }
.nav-links { display: flex; gap: 1.5rem; list-style: none; align-items: center; }
.nav-links a { color: var(--text-muted); text-decoration: none; font-size: .85rem; transition: color .2s; }
.nav-links a:hover, .nav-links a.active { color: var(--accent); }
.theme-toggle {
  background: none; border: 1px solid var(--border); color: var(--text-muted);
  border-radius: 6px; width: 34px; height: 34px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all .2s;
}
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); }

.tag {
  display: inline-block; font-family: 'Fira Code', monospace; font-size: .75rem;
  color: var(--accent); background: var(--accent-tint);
  border: 1px solid var(--accent); border-radius: 4px; padding: 2px 8px;
}

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

@media (max-width: 640px) {
  nav { padding: 0 1rem; }
  .article-hero, .article-body { padding-left: 1rem; padding-right: 1rem; }
}
"""


HTML_HEAD = """<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="__TITLE__ | #365DaysOfAI por Fabian Rodriguez">
  <title>__TITLE__ | #365DaysOfAI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
__CSS__
  </style>
</head>
<body>
  <nav>
    <a class="nav-logo" href="/">FR.</a>
    <ul class="nav-links">
      <li><a href="/">Portfolio</a></li>
      <li><a href="/blog/" class="active">#365DaysOfAI</a></li>
    </ul>
    <button class="theme-toggle" id="themeToggle" aria-label="Cambiar tema">
      <i class="fas fa-sun" id="themeIcon"></i>
    </button>
  </nav>

  <header class="article-hero">
    <div class="day-badge">Dia __DAY__ / 365 &nbsp;&middot;&nbsp; #365DaysOfAI</div>
    <h1 class="article-title">__TITLE__</h1>
    <div class="article-meta">
      <time class="article-date">__DATE__</time>
      <div class="tags"><span class="tag">__STACK__</span></div>
    </div>
  </header>

  <article class="article-body">
__BODY__
  </article>
  <nav class="article-nav" aria-label="Navegacion entre articulos">
    __NAV__
  </nav>


  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <script>
    hljs.highlightAll();
    document.addEventListener('DOMContentLoaded', function() {
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

    var _html = document.documentElement;
    var _btn  = document.getElementById('themeToggle');
    var _icon = document.getElementById('themeIcon');
    function _setIcon(t) { _icon.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon'; }
    var _saved = localStorage.getItem('theme') || 'dark';
    _html.setAttribute('data-theme', _saved);
    _setIcon(_saved);
    _btn.addEventListener('click', function() {
      var next = _html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      _html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      _setIcon(next);
    });
  </script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      var nextBtn = document.querySelector('.nav-next');
      if (nextBtn && nextBtn.dataset.date) {
        var nextDate = new Date(nextBtn.dataset.date);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        nextDate.setHours(0, 0, 0, 0);
        if (nextDate > today) {
          nextBtn.style.display = 'none';
        }
      }
    });
  </script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def date_for_day(day: int) -> datetime.date:
    """Return the canonical calendar date for the given day, from the master table."""
    return get_date(day)


def format_date(d: datetime.date) -> str:
    return f"{d.day} de {SPANISH_MONTHS[d.month - 1]} de {d.year}"


def build_nav_links(day: int) -> str:
    """Build the prev/next links for an article."""
    parts: list[str] = ['<a href="/blog/">Todos los articulos</a>']

    if day > 1:
        prev = day - 1
        tema_prev = next((t for d, t, _, _ in DAYS if d == prev), "")
        slug_prev = build_path(prev, tema_prev)
        parts.insert(0, f'<a class="nav-prev" href="/blog/{slug_prev}/">Anterior</a>')

    if day < 365:
        nxt = day + 1
        tema_nxt = next((t for d, t, _, _ in DAYS if d == nxt), "")
        slug_nxt = build_path(nxt, tema_nxt)
        date_nxt = date_for_day(nxt).isoformat()
        parts.append(
            f'<a class="nav-next" href="/blog/{slug_nxt}/" data-date="{date_nxt}">Siguiente</a>'
        )

    return "\n    ".join(parts)


def parse_md_article(text: str) -> dict:
    """Parse a sub-agent output that uses ### METADATA / ### ARTICULO delimiters."""
    # Find the metadata and article blocks.
    # The metadata is between "### METADATA" and "### ARTICULO".
    meta_match = re.search(
        r"###\s*METADATA\s*\n(.*?)\n###\s*ARTICULO\s*\n(.*)",
        text,
        re.DOTALL,
    )
    if not meta_match:
        # Fallback: maybe just title in first line, body after a separator.
        return {
            "title": "",
            "stack": "",
            "mode": "",
            "body": text,
        }
    meta_block = meta_match.group(1)
    body_md = meta_match.group(2).strip()

    # Remove leading H1 from body if present (we use the title in the header)
    # The master prompt says "no H1 en el cuerpo".
    # Body can start with an H2 'Introduccion' or anything else.

    title = ""
    stack = ""
    mode = ""
    for line in meta_block.split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            k = k.strip().lower()
            v = v.strip()
            if k == "articulo":
                # "Dia N/365: TEMA — subtitulo"
                # Use the full string as title (with article-day format)
                title = v
            elif k == "tecnologia":
                stack = v
            elif k == "modo":
                mode = v

    return {"title": title, "stack": stack, "mode": mode, "body": body_md}


def render(day: int, md_text: str, out_path: Path) -> None:
    """Render an article from markdown + metadata to the blog's HTML skeleton."""
    parsed = parse_md_article(md_text)
    title = parsed["title"] or f"Dia {day}/365: Articulo"
    stack = parsed["stack"] or "AI"
    body_md = parsed["body"]
    body_html = md_to_html(body_md)

    date = date_for_day(day)
    date_str = format_date(date)
    nav_links = build_nav_links(day)

    html = (HTML_HEAD
            .replace("__TITLE__", title)
            .replace("__STACK__", stack)
            .replace("__DAY__", str(day))
            .replace("__DATE__", date_str)
            .replace("__BODY__", body_html)
            .replace("__NAV__", nav_links)
            .replace("__CSS__", HTML_HEAD_CSS))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    print(f"Wrote: {out_path}  ({len(body_html)} bytes body)")

    # Update the blog's index.html card for this day.
    try:
        update_index_card(day, title, stack, date_str)
    except Exception as exc:  # noqa: BLE001
        # Index update is best-effort: don't fail the render if index
        # has an unexpected format.
        print(f"WARN: failed to update index.html card: {exc}")


def update_index_card(day: int, full_title: str, stack: str, date_str: str) -> None:
    """Update the <article-card data-day="N"> block in blog/index.html.

    full_title is the "Dia N/365: TEMA — subtitulo" string from the metadata.
    The card's <h3> uses just "TEMA — subtitulo" (no "Dia N/365:" prefix).
    The tags are split by comma and lowercased.
    """
    index_path = BLOG_DIR / "index.html"
    text = index_path.read_text(encoding="utf-8")

    h3_text = strip_day_prefix(full_title).strip()

    # Update the href to the canonical folder for this day.
    canonical_path = "/blog/" + build_path(day, next(
        (t for d, t, _, _ in DAYS if d == day), ""
    )) + "/"
    href_pattern = re.compile(
        r'(<a class="article-card" data-day="' + str(day) + r'"\s+)href="[^"]+"',
        re.DOTALL,
    )
    new_text, n = href_pattern.subn(
        lambda m: m.group(1) + f'href="{escape_html(canonical_path)}"',
        text, count=1,
    )
    if n != 1:
        raise RuntimeError(
            f"could not find <a data-day='{day}'> in index.html"
        )

    # Replace the <h3>...</h3> inside the day N card.
    h3_pattern = re.compile(
        r'(<a class="article-card" data-day="' + str(day) + r'"[^>]*>'
        r'.*?<h3>)[^<]*(</h3>)',
        re.DOTALL,
    )
    new_text, n = h3_pattern.subn(
        lambda m: m.group(1) + escape_html(h3_text) + m.group(2),
        new_text, count=1,
    )
    if n != 1:
        raise RuntimeError(
            f"could not find <h3> for day {day} in index.html"
        )

    # Replace the <div class="tags">...</div> inside the day N card.
    # The regex captures the existing <div class="tags"> open tag and the
    # closing </div>; we replace the INNER content (between them) with the
    # new tags.
    tags_pattern = re.compile(
        r'(<a class="article-card" data-day="' + str(day) + r'"[^>]*>'
        r'.*?<div class="tags">)(.*?)(</div>)',
        re.DOTALL,
    )
    new_text, n = tags_pattern.subn(
        lambda m: m.group(1) + build_tags_inner(stack) + m.group(3),
        new_text, count=1,
    )
    if n != 1:
        raise RuntimeError(
            f"could not find <div class=tags> for day {day} in index.html"
        )

    # Replace the <time>...</time> inside the day N card.
    time_pattern = re.compile(
        r'(<a class="article-card" data-day="' + str(day) + r'"[^>]*>'
        r'.*?<time>)[^<]*(</time>)',
        re.DOTALL,
    )
    new_text, n = time_pattern.subn(
        lambda m: m.group(1) + escape_html(date_str) + m.group(2),
        new_text, count=1,
    )
    if n != 1:
        raise RuntimeError(
            f"could not find <time> for day {day} in index.html"
        )

    index_path.write_text(new_text, encoding="utf-8")
    print(f"Updated index.html card for day {day}")


def strip_day_prefix(title: str) -> str:
    """Strip 'Dia N/365: ' prefix from a title for the index card."""
    return re.sub(r"^Dia\s+\d+/\d+:\s*", "", title).strip()


def build_tags_html(stack: str) -> str:
    """Build the full <div class="tags">...</div> HTML for the index card."""
    return f'<div class="tags">{build_tags_inner(stack)}</div>'


def build_tags_inner(stack: str) -> str:
    """Build the inner spans (no <div> wrapper) for the index card tags.

    Generates 4-7 tags from the stack string by splitting on commas,
    stripping parentheses/parameters, splitting library names on '.',
    and capping at 7 to keep the card compact.
    """
    raw = [t.strip() for t in stack.split(",") if t.strip()]
    if not raw:
        raw = ["ai"]
    tags: list[str] = []
    seen: set[str] = set()
    for piece in raw:
        # Split on '.' to break "torch.nn.init" into "torch", "nn", "init"
        parts = piece.replace("(", " ").replace(")", " ").split(".")
        for p in parts:
            p = p.strip().lower()
            # Skip empty / pure-noise tokens
            if not p or p in {"import", "from", "el", "la", "de", "los", "las"}:
                continue
            # Trim long descriptive tails (e.g. "torchvision.models (param pretrained=True)")
            if len(p) > 22:
                continue
            if p in seen:
                continue
            seen.add(p)
            tags.append(p)
            if len(tags) >= 7:
                return "".join(f'<span class="tag">{escape_html(t)}</span>' for t in tags)
    return "".join(f'<span class="tag">{escape_html(t)}</span>' for t in tags)


def escape_html(text: str) -> str:
    """Minimal HTML escape for text content."""
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;"))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", type=int, required=True, help="day number 1-365")
    parser.add_argument("--input", required=True, help="path to source markdown")
    parser.add_argument(
        "--output",
        help="path to output HTML. Default: blog/dia-N365-{slug}/index.html",
    )
    args = parser.parse_args()

    md_text = Path(args.input).read_text(encoding="utf-8")

    if args.output:
        out_path = Path(args.output)
        if not out_path.is_absolute():
            # Treat relative paths as relative to repo root
            # (parent of blog/_pipeline/), not cwd.
            repo_root = Path(__file__).resolve().parent.parent.parent
            out_path = (repo_root / out_path).resolve()
    else:
        tema = next((t for d, t, _, _ in DAYS if d == args.day), "articulo")
        out_path = (BLOG_DIR / build_path(args.day, tema) / "index.html").resolve()

    render(args.day, md_text, out_path)


if __name__ == "__main__":
    main()
