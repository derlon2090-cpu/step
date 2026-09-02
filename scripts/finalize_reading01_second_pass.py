"""Final audit for the two visual passes of Reading 01.

This audit checks the reviewer-entered decisions, sequence, source traceability,
and the discovered no-question-mark prompts. It never derives answers.
"""
from pathlib import Path
import json

path = Path("data/visual-review/reading-01.json")
record = json.loads(path.read_text(encoding="utf-8"))
questions = record["questions"]

assert record["sourcePages"] == list(range(4, 15))
assert len(questions) == 50
assert [question["displayOrder"] for question in questions] == list(range(1, 51))
assert len({question["questionText"] + str(question["sourcePages"]) for question in questions}) == 50
assert all(question["visualReviewStatus"] == "verified" for question in questions)
assert all(question["correctAnswer"] is None and question["answerStatus"] == "missing" for question in questions)
assert all(question["questionText"].strip() for question in questions)
assert all(question["sourcePages"] and set(question["sourcePages"]).issubset(set(range(4, 15))) for question in questions)

discovered = [question for question in questions if "lacks a conventional trailing question mark" in question.get("reviewNote", "")]
assert len(discovered) == 6
excluded = record.get("excludedCandidates", [])
assert len(excluded) == 1 and excluded[0]["candidateStatus"] == "duplicate"

record["secondReviewStatus"] = "verified"
record["visualQuestionReviewStatus"] = "verified"
record["reviewNotes"].append(
    "Second visual pass completed for pages 4-14: source order, question boundaries, adjacent responses/translations, visible option boundaries, discovered prompts, and excluded technical duplicate were reconciled."
)
path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
print("Reading 01 second pass validated: 50 questions, 6 visually discovered prompts, 1 technical duplicate excluded.")
