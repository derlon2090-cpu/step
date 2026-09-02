"""Stage only traceable, non-approved candidates for Reading 01 review.

This helper is deliberately conservative: it never overwrites manually
reviewed records, never sets a question to verified, never invents options,
and never writes an answer key.  Its output is a checkpoint for a reviewer to
complete against the page image.
"""
from pathlib import Path
import json

review_path = Path("data/visual-review/reading-01.json")
layout_path = Path("data/questions-layout/reading-01.json")
review = json.loads(review_path.read_text(encoding="utf-8"))
layout = json.loads(layout_path.read_text(encoding="utf-8"))

existing_blocks = {tuple(question["sourceBlockIds"]) for question in review["questions"]}
for candidate in layout["questions"]:
    block_ids = tuple(candidate["sourceBlockIds"])
    if block_ids in existing_blocks:
        continue
    review["questions"].append({
        "readingId": "reading-01",
        "sourceQuestionNumber": None,
        "displayOrder": len(review["questions"]) + 1,
        "questionText": candidate["questionText"],
        "options": [],
        "correctAnswer": None,
        "answerStatus": "missing",
        "sourcePages": candidate["sourcePages"],
        "sourceBlockIds": candidate["sourceBlockIds"],
        "visualReviewStatus": "requires_review",
        "visualReviewedAt": None,
        "reviewReason": "The prompt boundary is traceable to the rendered page, but its option set and adjacent answer/translation separation have not yet been transcribed into the final review record.",
    })

review["reviewNotes"].append(
    "A conservative candidate checkpoint was staged from page geometry after visual page inspection. It contains no auto-approved question, option, or answer."
)
review_path.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Reading 01 checkpoint now has {len(review['questions'])} records; only pre-existing manual records remain verified.")
