from pathlib import Path
import json
import re

records = [json.loads((Path("data/extraction") / f"reading-{number:02d}.json").read_text(encoding="utf-8")) for number in range(1, 50)]

assert len(records) == 49
assert [record["order"] for record in records] == list(range(1, 50))
assert len({record["id"] for record in records}) == 49
assert all(record["verification"]["sourcePagesContiguous"] for record in records)
assert all(record["verification"]["sourcePageCountMatchesRange"] for record in records)
assert all(record["contentStatus"] == "verified" for record in records)
assert all(record["questionStatus"] == "verified" for record in records)
assert all(record["answerKeyStatus"] == "missing" for record in records)
assert sum(record["titleStatus"] == "verified" for record in records) == 47
assert [record["order"] for record in records if record["titleStatus"] == "missing"] == [16, 17]

non_educational_pattern = re.compile(
    r"https?://|t\.me/|أكاديمية\s+ستيب|Free\s+STEP\s+Academy|"
    r"مؤسس\s+الأكاديمية|(?:ا|إ)عداد\s+وترجمة|(?:ا|إ)شراف(?:\s|$)|"
    r"Real_MaL4Kx9|تجميعات\s+متفرقة|تأكدوا\s+من\s+الحل|كل\s+الشكر|"
    r"هنا\s+فقط|كل\s+الملفات\s+في\s+القناتين|أحدث\s+التجميعات",
    re.I,
)
for record in records:
    source_pages = record["source_pages"]
    assert record["source_content"] == "\n".join(page["text"] for page in source_pages)
    assert record["question_source_blocks"] == [
        {"sourcePage": page["page"], "content": page["text"]}
        for page in source_pages if "?" in page["text"]
    ]
    assert not non_educational_pattern.search(record["source_content"])

print("49 reading records verified: sequence, uniqueness, source page continuity, and source-order question blocks.")
for record in records:
    pages = record["source_page_range"]
    print(f"Reading {record['order']:02d} - Verified - pages {pages['start']}-{pages['end']}")
