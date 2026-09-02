"""Create conservative, source-traceable review worklists for readings 10-17.

This does not approve a question.  The geometry layer is used solely to make
each rendered-page comparison repeatable; every staged item remains
``requires_review`` until a human visual pass confirms it.
"""
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path("data")

for order in range(10, 18):
    path = ROOT / "visual-review" / f"reading-{order:02d}.json"
    review = json.loads(path.read_text(encoding="utf-8"))
    if review["questions"]:
        continue

    candidates = json.loads(
        (ROOT / "questions-layout" / f"reading-{order:02d}.json").read_text(encoding="utf-8")
    )["questions"]
    review["questions"] = [
        {
            "readingId": review["readingId"],
            "sourceQuestionNumber": candidate.get("sourceQuestionNumber"),
            "displayOrder": display_order,
            "questionText": candidate["questionText"],
            "options": [],
            "correctAnswer": None,
            "answerStatus": "missing",
            "sourcePages": candidate["sourcePages"],
            "sourceBlockIds": candidate["sourceBlockIds"],
            "visualReviewStatus": "requires_review",
            "visualReviewedAt": None,
            "reviewReason": (
                "Geometry-derived worklist item. Its prompt boundary, visible "
                "options, and separation from adjacent answer/translation still "
                "require rendered-PDF review."
            ),
            "candidateStatus": "pending_visual_review",
        }
        for display_order, candidate in enumerate(candidates, start=1)
    ]
    review["visualQuestionReviewStatus"] = "in_progress"
    review["firstReviewStatus"] = "in_progress"
    review["reviewNotes"].append(
        "A source-traceable geometry worklist was staged for visual review. No item was automatically approved and no answer key was created."
    )
    path.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"staged {review['readingId']}: {len(candidates)} candidates")
