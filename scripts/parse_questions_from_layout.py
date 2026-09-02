"""Recover question text from the page's visual left-to-right line geometry.

The original text extractor interleaves an answer/Arabic translation after an
English prompt.  This parser uses coordinates so a prompt is cut at its actual
question mark on the rendered line rather than at the next extracted line.
It creates a separate review layer and never changes data/extraction.
"""
from pathlib import Path
import json
import re

LAYOUT = json.loads(Path("data/layout-lines.json").read_text(encoding="utf-8"))["pages"]
LAYOUT_BY_PAGE = {item["page"]: item for item in LAYOUT}
OUTPUT = Path("data/questions-layout")
OUTPUT.mkdir(parents=True, exist_ok=True)

# A strict interrogative-prefix check is useful for triage, but must not decide
# whether a source question exists: the booklet also uses forms such as
# "The materials ... are available for?".  A clean English line ending at '?'
# is therefore retained as a *candidate* and is never promoted to a student
# question without visual review.
QUESTION_PREFIX = re.compile(r"^(?:\d+[.)]\s*)?(?:what|which|when|where|why|how|according\s+to|the\s+word|choose|read|in\s+paragraph|based\s+on|look\s+at|find|who|can|does|is|are|will|would|should|did|do)\b", re.I)

def normalize_space(value):
    return re.sub(r"\s+", " ", value).strip()

def question_part(line):
    text = normalize_space(line["text"])
    marker = text.find("?")
    if marker < 0:
        return None
    candidate = text[: marker + 1]
    # Arabic text in the PDF does not provide reliable glyph ordering via
    # extraction.  Keep only left-to-right ASCII question lines and retain
    # their geometry for a later human visual comparison.
    if line["x0"] > 450 or not any(char.isascii() and char.isalpha() for char in candidate):
        return None
    # A question can share a line with an adjacent response.  The first '?'
    # is its safe boundary; nothing after it is copied into the prompt.
    return candidate, bool(QUESTION_PREFIX.match(candidate))

report = {
    "summary": {
        "readings": 49,
        "geometryBoundedCandidates": 0,
        "strongQuestionSignal": 0,
        "visualVerified": 0,
        "requiresReview": 0,
    },
    "readings": [],
}
for order in range(1, 50):
    record = json.loads((Path("data/extraction") / f"reading-{order:02d}.json").read_text(encoding="utf-8"))
    questions = []
    for source_page in record["source_pages"]:
        for line_index, line in enumerate(LAYOUT_BY_PAGE[source_page["page"]]["lines"], start=1):
            extracted = question_part(line)
            if not extracted:
                continue
            text, has_strong_signal = extracted
            questions.append({
                "id": f"reading-{order:02d}-q{len(questions)+1:02d}",
                "displayOrder": len(questions) + 1,
                "sourceQuestionNumber": None,
                "questionText": text,
                "options": [],
                "correctAnswer": None,
                "answerStatus": "missing",
                "sourcePages": [source_page["page"]],
                "sourceBlockIds": [f"page-{source_page['page']}-line-{line_index}"],
                "parseStatus": "geometry_bounded_candidate",
                "questionSignal": "strong" if has_strong_signal else "requires_semantic_review",
                "visualVerificationStatus": "requires_review",
                "reviewReason": "Recovered from the rendered page geometry. It is not approved for student display until the page is visually reviewed; no option set or answer is inferred.",
                "layout": {"top": line["top"], "x0": line["x0"], "x1": line["x1"]},
            })
    payload = {"readingId": record["id"], "questions": questions}
    (OUTPUT / f"reading-{order:02d}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    strong_signals = sum(item["questionSignal"] == "strong" for item in questions)
    report["summary"]["geometryBoundedCandidates"] += len(questions)
    report["summary"]["strongQuestionSignal"] += strong_signals
    report["summary"]["visualVerified"] += 0
    report["summary"]["requiresReview"] += len(questions)
    report["readings"].append({
        "readingId": record["id"],
        "geometryBoundedCandidates": len(questions),
        "strongQuestionSignal": strong_signals,
        "visualVerified": 0,
        "requiresReview": len(questions),
    })

Path("data/question-layout-recovery-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report["summary"], ensure_ascii=False))
