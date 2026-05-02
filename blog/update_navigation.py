#!/usr/bin/env python3
"""
Script to update article navigation with prev/next links based on chronological date order.
- Scans all blog/dia-*/index.html files
- Extracts date from <time class="article-date"> and day number from folder name
- Sorts articles by date chronologically
- Rewrites <nav class="article-nav"> with proper prev/next hrefs and data attributes
- Adds JavaScript to hide future-dated next buttons
"""

import os
import re
from datetime import datetime
from pathlib import Path
import glob

BLOG_DIR = Path("/data/data/com.termux/files/home/.hermes/IngFabianRodriguez.github.io/blog")
MONTH_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
}

def parse_spanish_date(date_str):
    """Parse date string like '4 de enero de 2026' to datetime"""
    match = re.match(r'(\d+)\s+de\s+(\w+)\s+de\s+(\d+)', date_str.strip())
    if match:
        day = int(match.group(1))
        month_name = match.group(2).lower()
        year = int(match.group(3))
        month = MONTH_MAP.get(month_name, 1)
        return datetime(year, month, day)
    return None

def extract_day_number(folder_name):
    """Extract day number from folder name like 'dia-5365-tensores...' -> 5"""
    match = re.match(r'dia-(\d+)365-', folder_name)
    if match:
        return int(match.group(1))
    return None

def get_articles():
    """Scan all article directories and extract metadata"""
    articles = []
    pattern = os.path.join(BLOG_DIR, "dia-*", "index.html")
    
    for html_path in glob.glob(pattern):
        folder_name = os.path.basename(os.path.dirname(html_path))
        folder_path = os.path.dirname(html_path)
        
        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract date from <time class="article-date">
        date_match = re.search(r'<time class="article-date">([^<]+)</time>', content)
        if date_match:
            date_str = date_match.group(1).strip()
            parsed_date = parse_spanish_date(date_str)
            if parsed_date:
                day_number = extract_day_number(folder_name)
                slug = folder_name  # folder name is the slug
                articles.append({
                    'slug': slug,
                    'folder_path': folder_path,
                    'html_path': html_path,
                    'date': parsed_date,
                    'date_str': date_str,
                    'day_number': day_number
                })
    
    return articles

def generate_nav_html(article, prev_article, next_article):
    """Generate the new navigation HTML"""
    prev_html = ""
    next_html = ""
    
    if prev_article:
        prev_html = f'<a class="nav-prev" href="/blog/{prev_article["slug"]}/">← Anterior</a>'
    
    if next_article:
        date_iso = next_article['date'].strftime('%Y-%m-%d')
        next_html = f'<a class="nav-next" href="/blog/{next_article["slug"]}/" data-date="{date_iso}">Siguiente →</a>'
    
    # Build the complete nav with 3 elements always
    nav_html = f'''  <nav class="article-nav" aria-label="Navegación entre artículos">
    {prev_html}
    <a href="/blog/">↑ Todos los artículos</a>
    {next_html}
  </nav>'''
    
    return nav_html

def generate_js_block():
    """Generate the JavaScript block to hide future-dated next buttons"""
    return '''  <script>
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
  </script>'''

def update_article(article, prev_article, next_article):
    """Update a single article's HTML with new navigation"""
    html_path = article['html_path']
    
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Generate new nav HTML
    new_nav = generate_nav_html(article, prev_article, next_article)
    
    # Pattern to match the existing nav block
    nav_pattern = r'\s*<nav class="article-nav"[^>]*>.*?</nav>'
    
    # Replace the old nav with new nav
    new_content = re.sub(nav_pattern, '\n' + new_nav + '\n', content, flags=re.DOTALL)
    
    # Remove any existing hide-future script block if present
    hide_script_pattern = r'\s*<script>\s*document\.addEventListener\(\'DOMContentLoaded\',.*?\.nav-next.*?nextDate\s*>\s*today.*?</script>'
    new_content = re.sub(hide_script_pattern, '', new_content, flags=re.DOTALL)
    
    # Add new JS block before </body>
    js_block = generate_js_block()
    new_content = new_content.replace('</body>', js_block + '\n</body>')
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

def main():
    print("Scanning articles...")
    articles = get_articles()
    print(f"Found {len(articles)} articles")
    
    if not articles:
        print("No articles found!")
        return
    
    # Sort by date chronologically
    articles.sort(key=lambda x: x['date'])
    
    print("\nArticles sorted by date:")
    for i, art in enumerate(articles):
        print(f"  {i+1}. {art['slug']} - {art['date_str']}")
    
    # Update each article with prev/next links
    updated_count = 0
    for i, article in enumerate(articles):
        prev_article = articles[i - 1] if i > 0 else None
        next_article = articles[i + 1] if i < len(articles) - 1 else None
        
        update_article(article, prev_article, next_article)
        updated_count += 1
    
    print(f"\n✓ Updated {updated_count} articles with new navigation")
    
    # Show first few and last few for verification
    print("\nFirst 3 articles (oldest):")
    for art in articles[:3]:
        print(f"  - {art['slug']} ({art['date_str']})")
    
    print("\nLast 3 articles (newest):")
    for art in articles[-3:]:
        print(f"  - {art['slug']} ({art['date_str']})")

if __name__ == "__main__":
    main()
