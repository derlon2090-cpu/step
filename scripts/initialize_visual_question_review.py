"""Create the separate, source-preserving visual-review worklist.

This is intentionally an initialization step, not a question extractor.  It
does not promote candidates, infer options, or write answer keys.  A reviewer
adds only visually confirmed questions after comparing the rendered PDF page.
"""
from pathlib import Path
import json

output = Path("data/visual-review")
output.mkdir(parents=True, exist_ok=True)
report_rows = []

for order in range(1, 50):
    source = json.loads((Path("data/extraction") / f"reading-{order:02d}.json").read_text(encoding="utf-8"))
    record = {
        "readingId": source["id"],
        "sourcePages": [page["page"] for page in source["source_pages"]],
        "sourcePageRange": source["source_page_range"],
        "visualQuestionReviewStatus": "not_started",
        "firstReviewStatus": "not_started",
        "secondReviewStatus": "not_started",
        "questions": [],
        "duplicateTechnicalRecordsRemoved": 0,
        "reviewNotes": [],
    }
    (output / f"reading-{order:02d}.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    report_rows.append({
        "readingId": source["id"],
        "sourcePages": source["source_page_range"],
        "visualQuestionReviewStatus": "not_started",
        "questionsDetected": 0,
        "questionsVisuallyVerified": 0,
        "requiresReview": 0,
        "duplicateTechnicalRecordsRemoved": 0,
    })

report = {
    "source": "القطع النماذج ال 49.pdf",
    "scope": "Visual review only. Correct answers, scoring, timer, and results are excluded.",
    "summary": {
        "readings": 49,
        "notStarted": 49,
        "inProgress": 0,
        "verified": 0,
        "requiresReview": 0,
        "realQuestions": 0,
        "visuallyVerifiedQuestions": 0,
    },
    "readings": report_rows,
}
Path("data/visual-question-review-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("Initialized 49 separate visual-review records; no question was promoted or answered.")
