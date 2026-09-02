"""Validate the coordinate-derived question-candidate layer.

This deliberately validates provenance and safe boundaries only.  It does not
turn a candidate into a verified question and does not infer answers.
"""
from pathlib import Path
import json
import re

QUESTION_ID = re.compile(r"^reading-(\d{2})-q(\d{2,})$")

for order in range(1, 50):
    record_path = Path("data/extraction") / f"reading-{order:02d}.json"
    candidate_path = Path("data/questions-layout") / f"reading-{order:02d}.json"
    source = json.loads(record_path.read_text(encoding="utf-8"))
    derived = json.loads(candidate_path.read_text(encoding="utf-8"))

    assert derived["readingId"] == source["id"]
    allowed_pages = {page["page"] for page in source["source_pages"]}
    previous_page = 0
    previous_top = -1
    for expected, question in enumerate(derived["questions"], start=1):
        match = QUESTION_ID.match(question["id"])
        assert match and int(match.group(1)) == order and int(match.group(2)) == expected
        assert question["displayOrder"] == expected
        assert question["questionText"].endswith("?")
        assert question["questionText"].count("?") == 1
        assert question["correctAnswer"] is None
        assert question["answerStatus"] == "missing"
        assert question["options"] == []
        assert question["parseStatus"] == "geometry_bounded_candidate"
        assert question["visualVerificationStatus"] == "requires_review"
        assert question["sourcePages"] and set(question["sourcePages"]).issubset(allowed_pages)
        page = question["sourcePages"][0]
        top = question["layout"]["top"]
        assert page > previous_page or (page == previous_page and top >= previous_top)
        previous_page, previous_top = page, top

print("layout question candidate validation passed: 49 readings; no candidate is visually verified or has an inferred answer")
