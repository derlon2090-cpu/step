"""Materialize the human visual-review decisions for Reading 01.

The decisions in this file come from rendered source pages 4-14.  This script
does not inspect PDFs or infer decisions; it only writes the reviewed
transcription checkpoint, leaving answer keys empty.
"""
from pathlib import Path
import json

path = Path("data/visual-review/reading-01.json")
record = json.loads(path.read_text(encoding="utf-8"))

options = {
    'The word "can" in the first sentence. What is the point of using it?': ["facts", "confused", "interest"],
    '*Where does oud come from?': ["Ethiopia", "Thailand", "Yemen", "India"],
    '* The Oud used in incense is in the form of': ["Bark", "Chips", "Oil"],
    'How do they make the little bottles which called in Arabic Talat ?': ["They put it in water", "they evaporate it"],
    'What is the best title?': ["ant kinds", "ant food", "ant studies of scientists", "Ant mirror of human activity"],
    'What is the sentence that is not mentioned in the third paragraph?': ["Ants differ in color", "Ants differ in their diet", "Ants differ in their nemesis", "Ants has different organs"],
    'What do you understand from this statement?': ["We need to gather roses in winter", "No roses grow in winter", "good memories solve problems.", "Happy memories are bad in winter."],
    'Who won the award?': ["Dave alone", "team of three students", "Dave and three students", "Dave and three teams."],
}

duplicate_text = 'collected ?'
final_questions = []
duplicates = 0
excluded_candidates = []
for candidate in record["questions"]:
    if candidate["questionText"] == duplicate_text:
        candidate["candidateStatus"] = "duplicate"
        candidate["visualReviewStatus"] = "requires_review"
        candidate["reviewReason"] = "Technical duplicate of the preceding harvesting/reaper prompt: it is produced from the adjacent Arabic translation line, not a separate rendered English question."
        excluded_candidates.append(candidate)
        duplicates += 1
        continue
    candidate.pop("candidateStatus", None)
    candidate["visualReviewStatus"] = "verified"
    candidate["visualReviewedAt"] = "2026-09-02"
    candidate.pop("reviewReason", None)
    if candidate["questionText"] in options:
        candidate["options"] = [{"label": None, "text": item} for item in options[candidate["questionText"]]]
    candidate["reviewNote"] = "Prompt, choices (where present), translation, and adjacent underlined response were visually separated from the rendered source page."
    final_questions.append(candidate)

# These prompts are visibly present but are not candidates because the PDF
# omits a conventional trailing question mark.  They are added only after the
# page-image review, preserving their exact printed wording.
manual_questions = [
    (7, "page-7-visual-region-2", "We can't use Oud in :", ["Cleaning."]),
    (8, "page-8-visual-region-2", "The Oud used in incense is in the form of", ["Bark", "Chips", "Oil"]),
    (8, "page-8-visual-region-3", "Oud is taken from:", ["all healthy and green trees", "old trees", "15 types of trees", "4 , 5 types of tree"]),
    (9, "page-9-visual-region-4", "This type of meat ant from ants:", ["You make a servant for the rest of the ants.", "Protect their nest."]),
    (14, "page-14-visual-region-3", "Blue, red, green .... these words are about:", ["Price", "Sizes", "Colors"]),
    (14, "page-14-visual-region-4", "Small and medium, these words are about:", ["Price", "Sizes", "Colors"]),
]
for page, block_id, text, choices in manual_questions:
    final_questions.append({
        "readingId": "reading-01", "sourceQuestionNumber": None,
        "displayOrder": 0, "questionText": text,
        "options": [{"label": None, "text": item} for item in choices],
        "correctAnswer": None, "answerStatus": "missing",
        "sourcePages": [page], "sourceBlockIds": [block_id],
        "visualReviewStatus": "verified", "visualReviewedAt": "2026-09-02",
        "reviewNote": "Question lacks a conventional trailing question mark in the PDF; it was added only after visual source-page review.",
    })

for index, question in enumerate(final_questions, start=1):
    question["displayOrder"] = index

record["questions"] = final_questions
record["excludedCandidates"] = excluded_candidates
record["duplicateTechnicalRecordsRemoved"] = duplicates
record["firstReviewStatus"] = "verified"
record["visualQuestionReviewStatus"] = "in_progress"
record["reviewNotes"].append("First visual pass completed for pages 4-14. One translation-derived technical duplicate was removed; four visible no-question-mark prompts were added after visual review.")
path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"First pass complete: {len(final_questions)} questions retained; {duplicates} technical duplicate removed.")
