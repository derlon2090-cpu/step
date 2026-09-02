from pathlib import Path
import json

records = []
for order in range(1, 50):
    source = Path("data/extraction") / f"reading-{order:02d}.json"
    record = json.loads(source.read_text(encoding="utf-8"))
    parsed_questions = json.loads((Path("data/questions") / f"reading-{order:02d}.json").read_text(encoding="utf-8"))["questions"]
    visual_review = json.loads((Path("data/visual-review") / f"reading-{order:02d}.json").read_text(encoding="utf-8"))
    # The student payload receives only questions reviewed against a rendered
    # PDF page.  Candidate extraction remains in data/questions and is never
    # substituted here.
    student_questions = []
    for question in visual_review["questions"]:
        # A question is exposed only after the entire reading has completed
        # both visual passes.  Per-question review alone is not enough to
        # protect against a missed neighbouring question or page-break option.
        if visual_review["visualQuestionReviewStatus"] != "verified" or question["visualReviewStatus"] != "verified":
            continue
        student_questions.append({
            **question,
            "id": f"reading-{order:02d}-reviewed-q{question['displayOrder']:02d}",
            "options": [
                {**option, "selectionId": option["label"] or f"choice-{index}"}
                for index, option in enumerate(question["options"], start=1)
            ],
            "visualVerificationStatus": "verified",
            "parseStatus": "visually_verified",
            "rawBlock": None,
        })
    source_arabic_title = record["arabicTitle"]
    # "عناوين النموذج" is a source section label, not a model name.  Showing
    # it as the card title would falsely imply a named passage.  The agreed
    # source-only fallback is the ordered Arabic label; the source heading is
    # still retained verbatim in sourceArabicTitle.
    generic_model_heading = bool(source_arabic_title and source_arabic_title.strip().startswith("عناوين النموذج"))
    display_title = record["internalArabicLabel"] or f"القطعة {order:02d}" if generic_model_heading else (source_arabic_title or record["internalArabicLabel"])
    records.append({
        "id": record["id"],
        "order": record["order"],
        "arabicTitle": display_title,
        "sourceArabicTitle": source_arabic_title,
        "displayTitleStatus": "fallback_order_label" if generic_model_heading or not source_arabic_title else "source_title",
        "titleStatus": record["titleStatus"],
        "sourcePages": [page["page"] for page in record["source_pages"]],
        "content": record["source_content"],
        "contentBlocks": record["source_pages"],
        "internalSections": record["title_index_source_lines"],
        "questions": student_questions,
        "questionSourceBlocks": record["question_source_blocks"],
        "questionCount": len(student_questions),
        "verifiedQuestionCount": len(student_questions),
        "textuallyVerifiedQuestionCount": sum(question["parseStatus"] == "textually_verified" for question in parsed_questions),
        "translation": None,
        "vocabulary": None,
        "answerKeyStatus": record["answerKeyStatus"],
        "contentStatus": record["contentStatus"],
        "questionStatus": record["questionStatus"],
    })

target = Path("src/data/readings.js")
target.parent.mkdir(parents=True, exist_ok=True)
payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
target.write_text(
    "// Generated solely from data/extraction/reading-01.json through reading-49.json.\n"
    "// Do not add inferred titles, questions, options, or answers here.\n"
    f"export const readings = {payload};\n"
    "export const readingsById = new Map(readings.map((reading) => [reading.id, reading]));\n",
    encoding="utf-8",
)
print(f"Generated {len(records)} reading records at {target}")
