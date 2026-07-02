"""
Update blog/index.html to point to the renamed canonical folder names.

Strategy: for each day, find the OLD href in the index.html (based on the
folder name as currently on disk) and rewrite it to the canonical new name.

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
TODAY = re.compile(r"^dia-(\d+)365")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        args.dry_run = True

    days_tema = {day: tema for day, tema, _stack in DAYS}

    # Build map: old folder name -> new folder name (only for the rename range 113-365)
    plan: dict[str, str] = {}
    for d in BLOG_DIR.iterdir():
        if not d.is_dir():
            continue
        m = TODAY.match(d.name)
        if not m:
            continue
        day = int(m.group(1))
        if day < 113 or day > 365:
            continue
        tema = days_tema[day]
        new_name = build_path(day, tema)
        if new_name != d.name:
            plan[d.name] = new_name

    text = INDEX.read_text(encoding="utf-8")
    original = text
    changes = 0

    for old, new in plan.items():
        # Match both href="/blog/dia-N365-old-slug/" and bare references
        patterns = [
            (rf'href="/blog/{re.escape(old)}/"', f'href="/blog/{new}/"'),
            (rf'href="/blog/{re.escape(old)}/index.html"', f'href="/blog/{new}/index.html"'),
        ]
        for pat, repl in patterns:
            new_text, n = re.subn(pat, repl, text)
            if n > 0:
                text = new_text
                changes += n

    print(f"Index.html: {changes} references updated.")
    if not changes:
        print("No changes needed.")
        return

    if args.dry_run:
        # Show a few samples
        for old, new in list(plan.items())[:5]:
            print(f"  Would rewrite: /blog/{old}/ -> /blog/{new}/")
        print(f"  ... and {len(plan) - 5} more.")
        print("\nDRY RUN — no changes made. Re-run with --apply to execute.")
        return

    if args.apply:
        INDEX.write_text(text, encoding="utf-8")
        print(f"Wrote {INDEX}")


if __name__ == "__main__":
    main()
