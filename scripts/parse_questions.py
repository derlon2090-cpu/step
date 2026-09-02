from pathlib import Path
import json
import re

SOURCE = Path("data/extraction")
OUTPUT = Path("data/questions")
OUTPUT.mkdir(parents=True, exist_ok=True)

QUESTION_START = re.compile(
    r"(?:^|\s)(?:what|which|when|where|why|how|according\s+to|the\s+word|choose|read|in\s+paragraph|based\s+on|look\s+at|find|who|can|does|is|are|will|would|should|did|do)\b",
    re.I,
)
OPTION = re.compile(r"^\s*(?:\(?([A-Da-d])\)?[\s.\-:])\s*(.+)$")
NUMBER = re.compile(r"^\s*(\d{1,3})[.)]\s*")

def compact(text):
    return re.sub(r"\s+", " ", text).strip()

def is_question_line(line):
    # The source uses question marks in both English and Arabic translation.
    # We select only lines with an English interrogative marker and preserve the
    # unmodified surrounding source as rawBlock for subsequent review.
    return "?" in line and bool(QUESTION_START.search(line)) and bool(re.search(r"[A-Za-z]", line))

def parse_record(record):
    lines = []
    for page in record["source_pages"]:
        for line_index, raw in enumerate(page["text"].splitlines(), start=1):
            if raw.strip():
                lines.append({"sourcePage": page["page"], "line": line_index, "raw": raw})

    starts = [index for index, line in enumerate(lines) if is_question_line(line["raw"])]
    questions = []
    for order, start in enumerate(starts, start=1):
        end = starts[order] if order < len(starts) else len(lines)
        span = lines[start:end]
        source_line = span[0]["raw"]
        explicit_options = []
        for item in span[1:]:
            option = OPTION.match(item["raw"])
            if option:
                explicit_options.append({"label": option.group(1).upper(), "text": compact(option.group(2))})
        source_number = NUMBER.match(source_line)
        verified = len(explicit_options) >= 2 and len({option["label"] for option in explicit_options}) == len(explicit_options)
        questions.append({
            "id": f"{record['id']}-q{order:02d}",
            "order": order,
            "questionNumber": int(source_number.group(1)) if source_number else None,
            "questionText": compact(source_line),
            "options": explicit_options if verified else [],
            "correctAnswer": None,
            "answerStatus": "missing",
            "sourcePage": span[0]["sourcePage"],
            "sourceLine": span[0]["line"],
            "sourcePages": sorted({item["sourcePage"] for item in span}),
            "rawBlock": "\n".join(item["raw"] for item in span),
            "parseStatus": "textually_verified" if verified else "requires_review",
            "visualVerificationStatus": "requires_review",
            "reviewReason": "Visual PDF review has not yet been completed for this candidate." if verified else "The source does not expose a reliably labeled option set for this question candidate; rawBlock is retained verbatim for manual validation."
        })

    return questions, len(record["question_source_blocks"])

report = {"readings": [], "summary": {"readings": 49, "totalQuestions": 0, "textuallyVerified": 0, "visuallyVerified": 0, "requiresReview": 0, "correctAnswers": 0, "answerStatusMissing": 0}}
for number in range(1, 50):
    record = json.loads((SOURCE / f"reading-{number:02d}.json").read_text(encoding="utf-8"))
    questions, block_count = parse_record(record)
    payload = {"readingId": record["id"], "sourceQuestionBlocks": block_count, "questions": questions}
    (OUTPUT / f"reading-{number:02d}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    verified = sum(question["parseStatus"] == "textually_verified" for question in questions)
    requires_review = len(questions) - verified
    numbered = [question["questionNumber"] for question in questions if question["questionNumber"] is not None]
    duplicate_numbers = sorted({item for item in numbered if numbered.count(item) > 1})
    report["readings"].append({
        "readingId": record["id"], "sourceQuestionBlocks": block_count, "questions": len(questions), "verified": verified,
        "requiresReview": requires_review, "visuallyVerified": 0, "firstQuestionNumber": numbered[0] if numbered else None,
        "lastQuestionNumber": numbered[-1] if numbered else None, "duplicateQuestionNumbers": duplicate_numbers,
        "missingQuestionNumbers": [],
    })
    report["summary"]["totalQuestions"] += len(questions)
    report["summary"]["textuallyVerified"] += verified
    report["summary"]["requiresReview"] += requires_review
    report["summary"]["answerStatusMissing"] += len(questions)

Path("data/question-parsing-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report["summary"], ensure_ascii=False))
