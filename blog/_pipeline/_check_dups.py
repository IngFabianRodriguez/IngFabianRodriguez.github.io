"""Check duplicate hrefs in blog/index.html."""
import re
from collections import Counter
from pathlib import Path

text = Path(__file__).resolve().parent.parent.joinpath("index.html").read_text(encoding="utf-8")
hrefs = re.findall(r'href="(/blog/dia-\d+365-[^"]+)"', text)
print(f"Total hrefs: {len(hrefs)}")
counts = Counter(hrefs)
dups = [(h, c) for h, c in counts.items() if c > 1]
print(f"Duplicated hrefs (more than 1): {len(dups)}")

# Check 14 ambiguous days
DUP_DAYS = [209, 210, 231, 232, 237, 238, 239, 240, 323, 324, 325, 326, 327, 328]
print("\nWhat the index points to for ambiguous days:")
for h in hrefs:
    m = re.search(r"dia-(\d+)365", h)
    if m and int(m.group(1)) in DUP_DAYS:
        print(f"  {h}")
