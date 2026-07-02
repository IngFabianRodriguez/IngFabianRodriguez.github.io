"""
Rename blog folders to match the canonical master-prompt table.

Strategy:
  1. For each day, compute the canonical path from the master table.
  2. Find which existing folder(s) actually contain content for that day
     (by parsing the index.html or by string match in folder name).
  3. Move the existing folder(s) into the canonical path.
  4. Delete any duplicate folder left behind (only for days with 2+ variants).

Run with --dry-run to preview without changing anything.
Run with --apply to actually move.
"""

from __future__ import annotations
import argparse
import io
import re
import shutil
import sys
from pathlib import Path

# Force UTF-8 output for Windows consoles that default to cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent))
from days_table import DAYS, build_path, slugify, get_mode  # type: ignore


BLOG_DIR = Path(__file__).resolve().parent.parent  # blog/
TODAY = re.compile(r"^dia-(\d+)365")


def day_from_folder(name: str) -> int | None:
    m = TODAY.match(name)
    return int(m.group(1)) if m else None


def list_folders() -> dict[int, list[Path]]:
    """Group existing blog folders by day number."""
    out: dict[int, list[Path]] = {}
    for p in sorted(BLOG_DIR.iterdir()):
        if not p.is_dir():
            continue
        d = day_from_folder(p.name)
        if d is None:
            continue
        out.setdefault(d, []).append(p)
    return out


def folder_size(p: Path) -> int:
    idx = p / "index.html"
    if idx.exists():
        return idx.stat().st_size
    return 0


def title_from_index(p: Path) -> str:
    """Extract <h1 class="article-title"> from index.html if present."""
    idx = p / "index.html"
    if not idx.exists():
        return ""
    text = idx.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r'<h1 class="article-title">(.*?)</h1>', text, re.DOTALL)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def renames_for_day(day: int, tema: str) -> dict[Path, Path | None]:
    """Plan renames for one day.

    Returns mapping: existing_folder -> new_path_or_None_to_delete.

    Strategy (simplified — user approved "delete all on rename"):
      - Move the FIRST existing folder (largest) to the canonical name.
      - DELETE all other existing folders for that day (their content
        was likely off-topic anyway and we are regenerating from scratch).
    """
    new_path_name = build_path(day, tema)
    new_path = BLOG_DIR / new_path_name

    existing = []
    for p in BLOG_DIR.iterdir():
        if not p.is_dir():
            continue
        d = day_from_folder(p.name)
        if d == day:
            existing.append(p)

    # Sort by size desc — but since we delete the rest anyway, sort is for
    # deterministic plan only.
    existing.sort(key=lambda p: folder_size(p), reverse=True)

    if not existing:
        return {}  # day 144 case (will be created)

    plan: dict[Path, Path | None] = {}
    plan[existing[0]] = new_path  # rename canonical
    for extra in existing[1:]:
        plan[extra] = None  # delete
    return plan


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--day", type=int, help="only process this day")
    parser.add_argument(
        "--from-day", type=int, default=113,
        help="first day to process (default: 113)"
    )
    parser.add_argument(
        "--to-day", type=int, default=365,
        help="last day to process (default: 365)"
    )
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        args.dry_run = True

    days = {day: tema for day, tema, _stack in DAYS}

    # Find days with conflicts
    folders = list_folders()

    target_days = sorted(days.keys())
    if args.day is not None:
        target_days = [args.day]
    else:
        target_days = [d for d in target_days if args.from_day <= d <= args.to_day]

    moves: list[tuple[Path, Path]] = []
    deletes: list[Path] = []
    creates: list[Path] = []

    for day in target_days:
        tema = days[day]
        plan = renames_for_day(day, tema)
        for src, dst in plan.items():
            if dst is None:
                deletes.append(src)
            elif src.name != dst.name:
                moves.append((src, dst))

    # Find days that should exist but don't have any folder
    for day in target_days:
        if day not in folders:
            new_path = BLOG_DIR / build_path(day, days[day])
            creates.append(new_path)

    # Print plan
    print("=" * 60)
    print(f"RENAME PLAN ({len(moves)} moves, {len(deletes)} deletes, {len(creates)} creates)")
    print("=" * 60)
    for src, dst in moves:
        print(f"  MOVE: {src.name}/  ->  {dst.name}/")
    for d in deletes:
        print(f"  DELETE: {d.name}/  (size={folder_size(d)} bytes, title='{title_from_index(d)[:50]}')")
    for c in creates:
        print(f"  CREATE: {c.name}/  (missing, day {c.name.split('-')[1].replace('365', '')})")

    if args.dry_run:
        print("\nDRY RUN — no changes made. Re-run with --apply to execute.")
        return

    if args.apply:
        confirm = input("\nApply this plan? Type 'yes' to confirm: ")
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            return

        # First, rename moves (handle potential conflicts by doing two-phase)
        for src, dst in moves:
            if dst.exists():
                # Move existing out of the way temporarily with a suffix
                tmp = dst.with_suffix(dst.suffix + ".tmp-renaming")
                shutil.move(str(dst), str(tmp))
                shutil.move(str(src), str(dst))
                # Resolve temp: it's now an old folder the user can verify; for
                # now delete it (we already choose delete elsewhere)
                if tmp.exists():
                    shutil.rmtree(tmp, ignore_errors=True)
            else:
                shutil.move(str(src), str(dst))

        for d in deletes:
            if d.exists():
                shutil.rmtree(d, ignore_errors=True)

        for c in creates:
            if not c.exists():
                c.mkdir(parents=True, exist_ok=True)

        print("\nDone.")


if __name__ == "__main__":
    main()
