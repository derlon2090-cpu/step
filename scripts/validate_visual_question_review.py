"""Validate review structure without treating empty or unreviewed work as verified."""
from pathlib import Path
import json

allowed_reading_statuses = {"not_started", "in_progress", "verified", "requires_review"}
allowed_question_statuses = {"verified", "requires_review"}

records = []
for order in range(1, 50):
    source = json.loads((Path("data/extraction") / f"reading-{order:02d}.json").read_text(encoding="utf-8"))
    review = json.loads((Path("data/visual-review") / f"reading-{order:02d}.json").read_text(encoding="utf-8"))
    assert review["readingId"] == source["id"]
    assert review["sourcePages"] == [page["page"] for page in source["source_pages"]]
    assert review["visualQuestionReviewStatus"] in allowed_reading_statuses
    assert review["firstReviewStatus"] in allowed_reading_statuses
    assert review["secondReviewStatus"] in allowed_reading_statuses
    assert isinstance(review["duplicateTechnicalRecordsRemoved"], int)
    for display_order, question in enumerate(review["questions"], start=1):
        assert question["readingId"] == source["id"]
        assert question["displayOrder"] == display_order
        assert question["visualReviewStatus"] in allowed_question_statuses
        assert question["correctAnswer"] is None and question["answerStatus"] == "missing"
        assert question["sourcePages"] and set(question["sourcePages"]).issubset(set(review["sourcePages"]))
        assert question["sourceBlockIds"]
        if question["visualReviewStatus"] == "verified":
            assert question["visualReviewedAt"]
            assert question["questionText"] and isinstance(question["options"], list)
    if review["visualQuestionReviewStatus"] == "verified":
        assert review["firstReviewStatus"] == "verified"
        assert review["secondReviewStatus"] == "verified"
        assert all(question["visualReviewStatus"] == "verified" for question in review["questions"])
    records.append(review)

assert len(records) == 49
print("Visual-review data structure passed: 49 records, no answer key inferred.")
