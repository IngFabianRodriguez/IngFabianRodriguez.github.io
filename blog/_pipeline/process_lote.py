"""
Batch-process a list of days.

For each day, render the agent's markdown output to HTML and update the
blog/index.html card. Commit and push after each successful render.

Usage:
    python process_lote.py --days 76,77,78,79,80 --input-dir "C:\\...\\opencode"

Each --input-dir is searched for files matching `day-NNN-agent-output.md`.
If a file is missing, that day is skipped (with a warning).
"""

from __future__ import annotations
import argparse
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent))
from days_table import DAYS, build_path  # type: ignore

BLOG_DIR = Path(__file__).resolve().parent.parent
RENDER_SCRIPT = BLOG_DIR / "_pipeline" / "render_article.py"


def git(*args: str) -> tuple[int, str]:
    """Run a git command in the repo root and return (exit_code, stdout)."""
    result = subprocess.run(
        ["git", *args],
        cwd=BLOG_DIR.parent,
        capture_output=True,
        text=True,
    )
    return result.returncode, (result.stdout + result.stderr).strip()


def process_day(day: int, input_path: Path) -> bool:
    """Render one day, return True on success."""
    print(f"\n=== Day {day} ===")
    if not input_path.exists():
        print(f"  SKIP: {input_path} does not exist")
        return False

    # 1. Clean stale content from canonical folder
    canonical = BLOG_DIR / build_path(day, next(t for d, t, _, _ in DAYS if d == day))
    if canonical.exists():
        idx = canonical / "index.html"
        if idx.exists():
            idx.unlink()

    # 2. Clean any old non-canonical folder for this day
    for p in BLOG_DIR.iterdir():
        if not p.is_dir():
            continue
        m = re.match(r"^dia-(\d+)365", p.name)
        if not m:
            continue
        if int(m.group(1)) == day and p.name != canonical.name:
            print(f"  Removing stale folder: {p.name}")
            shutil.rmtree(p, ignore_errors=True)

    # 3. Render
    code, out = subprocess.getstatusoutput(
        f'python "{RENDER_SCRIPT}" --day {day} '
        f'--input "{input_path}" '
        f'--output "blog/{canonical.name}/index.html"'
    )
    if code != 0:
        print(f"  RENDER FAILED: {out}")
        return False
    print(f"  Rendered OK")

    # 4. Git add + commit + push
    code, out = git("add", "-A")
    if code != 0:
        print(f"  GIT ADD FAILED: {out}")
        return False

    code, out = git(
        "commit", "-m",
        f"feat(blog): day {day} regenerated from sub-agent output"
    )
    if code != 0:
        # Sometimes there's nothing to commit (already done). Check.
        if "nothing to commit" in out.lower():
            print(f"  Nothing to commit for day {day}")
            return True
        print(f"  GIT COMMIT FAILED: {out}")
        return False

    code, out = git("-c", "http.sslVerify=false", "push", "origin", "main")
    if code != 0:
        print(f"  GIT PUSH FAILED: {out}")
        return False
    print(f"  Pushed OK")
    return True


import shutil  # placed here to keep the imports tidy


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", required=True,
                        help="comma-separated list of days, e.g. '76,77,78'")
    parser.add_argument("--input-dir", required=True,
                        help="directory holding day-NNN-agent-output.md files")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    days = [int(d) for d in args.days.split(",") if d.strip()]
    print(f"Processing days {days} from {input_dir}")

    results: list[tuple[int, bool, str]] = []
    for day in days:
        md_path = input_dir / f"day-{day:03d}-agent-output.md"
        ok = process_day(day, md_path)
        results.append((day, ok, "ok" if ok else "fail"))

    print("\n=== SUMMARY ===")
    for day, ok, status in results:
        marker = "[OK]" if ok else "[FAIL]"
        print(f"  {marker} Day {day}: {status}")

    failed = [d for d, ok, _ in results if not ok]
    if failed:
        print(f"\nFailed days: {failed}")
        sys.exit(1)


if __name__ == "__main__":
    main()