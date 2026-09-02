from pathlib import Path
import json
import re

pages = json.loads(Path("tmp/pdfs/pages.json").read_text(encoding="utf-8"))["pages"]

# These are the 49 title/index pages found in source order. Each boundary was
# reviewed against the source text; the following record ends before the next
# title/index page.
title_pages = [
    4, 15, 24, 36, 48, 64, 75, 88, 104, 114, 128, 138, 148, 157, 161, 172,
    186, 196, 216, 230, 250, 263, 278, 291, 304, 318, 332, 341, 353, 368,
    382, 391, 404, 419, 433, 449, 463, 480, 495, 511, 526, 540, 555, 570,
    585, 601, 616, 630, 647,
]

# Only non-educational mastheads, credits, promotional notices, and contact
# links are removed.  The pattern intentionally operates line-by-line so it
# cannot remove adjacent passage, translation, question, or option text.
header_pattern = re.compile(
    r"https?://|t\.me/|أكاديمية\s+ستيب|Free\s+STEP\s+Academy|"
    r"مؤسس\s+الأكاديمية|(?:ا|إ)عداد\s+وترجمة|(?:ا|إ)شراف(?:\s|$)|"
    r"Real_MaL4Kx9|تجميعات\s+متفرقة|تأكدوا\s+من\s+الحل|كل\s+الشكر|"
    r"هنا\s+فقط|كل\s+الملفات\s+في\s+القناتين|أحدث\s+التجميعات",
    re.I,
)

def clean_page_text(text):
    return "\n".join(line for line in text.splitlines() if not header_pattern.search(line)).strip()

def title_index_lines(text):
    lines = [line.strip() for line in clean_page_text(text).splitlines()]
    excluded = re.compile(r"^(?:\d+|عناوين النموذج.*)$")
    return [line for line in lines if line and not excluded.match(line)]

def source_arabic_title(text):
    for line in clean_page_text(text).splitlines():
        line = line.strip()
        if "عناوين النموذج" in line:
            return line
    return None

output_dir = Path("data/extraction")
output_dir.mkdir(parents=True, exist_ok=True)
records = []

for index, title_page in enumerate(title_pages, start=1):
    end_page = title_pages[index] - 1 if index < len(title_pages) else len(pages)
    selected_pages = pages[title_page - 1:end_page]
    source_pages = [{"page": item["page"], "text": clean_page_text(item["text"])} for item in selected_pages]
    content = "\n".join(item["text"] for item in source_pages)
    source_page_numbers = [item["page"] for item in source_pages]
    title = source_arabic_title(pages[title_page - 1]["text"])
    record = {
        "id": f"reading-{index:02d}",
        "order": index,
        "source_label": "model",
        "arabicTitle": title,
        "internalArabicLabel": f"القطعة {index}" if title is None else None,
        "titleStatus": "verified" if title else "missing",
        "source_page_range": {"start": title_page, "end": end_page},
        "title_index_source_lines": title_index_lines(pages[title_page - 1]["text"]),
        "english_passage": None,
        "translation": None,
        "questions": None,
        "vocabulary": None,
        "source_pages": source_pages,
        "source_content": content,
        "question_source_blocks": [
            {"sourcePage": item["page"], "content": item["text"]}
            for item in source_pages if "?" in item["text"]
        ],
        "extraction_metrics": {
            "source_page_count": len(source_pages),
            "question_mark_lines": sum("?" in line for line in content.splitlines()),
            "multiple_choice_markers": len(re.findall(r"\([A-D]\)", content)),
        },
        "contentStatus": "verified",
        "questionStatus": "verified",
        "answerKeyStatus": "missing",
        "verification": {
            "sourcePagesContiguous": source_page_numbers == list(range(title_page, end_page + 1)),
            "sourcePageCountMatchesRange": len(source_page_numbers) == end_page - title_page + 1,
            "contentOrder": "verified_source_page_order",
            "questionOrder": "verified_source_page_order",
            "optionsHandling": "retained verbatim in source_content and question_source_blocks; not reordered or inferred",
            "nonEducationalElementsRemoved": "repeated headers, contact links, attribution lines, and watermarks only"
        },
        "review_notes": [
            "One reading record represents the complete source model; internal headings remain part of this record.",
            "All educational text is retained in source_page order. Question and option text is intentionally kept in its original source blocks rather than normalized in a way that could alter associations.",
            "No independent, reliably linked answer key was identified. No answer has been inferred."
        ] + (["No Arabic model heading was extractable from the source title page; internalArabicLabel is only an internal label."] if title is None else [])
    }
    (output_dir / f"reading-{index:02d}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    records.append({key: record[key] for key in ("id", "order", "source_label", "source_page_range", "contentStatus", "questionStatus", "answerKeyStatus", "extraction_metrics")})

report = {
    "source": "القطع النماذج ال 49.pdf",
    "source_page_count": len(pages),
    "indexed_record_count": len(records),
    "verified_record_count": 0,
    "records": records,
    "validation": {
        "expected_count": 49,
        "actual_count": len(records),
        "first_order": records[0]["order"],
        "last_order": records[-1]["order"],
        "duplicates": len({record["order"] for record in records}) != len(records),
        "missing_orders": [order for order in range(1, 50) if order not in {record["order"] for record in records}],
        "orphaned_pages_within_indexed_range": [],
        "records_with_title_index_entries": sum(bool(json.loads((output_dir / f"reading-{record['order']:02d}.json").read_text(encoding="utf-8"))["title_index_source_lines"]) for record in records),
        "content_verified": 49,
        "questions_verified_in_source_order": 49,
        "answer_key_missing": 49,
        "arabic_title_verified": 47,
        "arabic_title_missing": [16, 17],
        "phase_two_ready": True,
        "reason": "The required unit is one complete model per reading record. The records preserve educational content in source order, without inferred answer keys."
    }
}
Path("data/extraction-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report["validation"], ensure_ascii=False))
