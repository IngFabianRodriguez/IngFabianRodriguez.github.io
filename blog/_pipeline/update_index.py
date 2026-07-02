"""
Update blog/index.html to point to the renamed canonical folder names.

Strategy: parse the index.html to find each `<a data-day="N">` element and
rewrite the href to point to the canonical folder name for that day.
This handles the case where the index.html's hrefs still point to old
slugs that no longer exist on disk.

Run with --dry-run to preview, --apply to actually edit the file.
"""

from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent))
from days_table import DAYS, build_path  # type: ignore


BLOG_DIR = Path(__file__).resolve().parent.parent  # blog/
INDEX = BLOG_DIR / "index.html"
DATA_DAY = re.compile(r'data-day="(\d+)"')
HREF = re.compile(r'href="(/blog/dia-(\d+)365-[^"]+)"')
TITLE = re.compile(r'<h3>(.*?)</h3>')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--from-day", type=int, default=113)
    parser.add_argument("--to-day", type=int, default=365)
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        args.dry_run = True

    days_tema = {day: tema for day, tema, _stack in DAYS}
    canonical: dict[int, str] = {
        d: build_path(d, days_tema[d]) for d in days_tema
    }

    text = INDEX.read_text(encoding="utf-8")
    new_text = text
    changes = 0
    samples: list[tuple[str, str, str]] = []  # (day, old, new)

    # For each href in the index, check if it matches the canonical for that day.
    for m in HREF.finditer(text):
        full_href = m.group(1)
        day = int(m.group(2))
        if not (args.from_day <= day <= args.to_day):
            continue
        canon = canonical.get(day)
        if canon is None:
            continue
        new_href = f"/blog/{canon}/"
        if full_href != new_href:
            new_text = new_text.replace(
                f'href="{full_href}"', f'href="{new_href}"', 1
            )
            changes += 1
            if len(samples) < 8:
                # Try to grab the title for context
                title_match = TITLE.search(text[m.start():m.start() + 1000])
                title = title_match.group(1)[:60] if title_match else ""
                samples.append((str(day), full_href, new_href))

    print(f"Index.html: {changes} references updated (range {args.from_day}-{args.to_day}).")
    for day, old, new in samples:
        print(f"  Day {day}: {old}  ->  {new}")
    if changes > len(samples):
        print(f"  ... and {changes - len(samples)} more.")
    if not changes:
        print("No changes needed.")
        return

    if args.dry_run:
        print("\nDRY RUN — no changes made. Re-run with --apply to execute.")
        return

    if args.apply:
        INDEX.write_text(new_text, encoding="utf-8")
        print(f"Wrote {INDEX}")


if __name__ == "__main__":
    main()
