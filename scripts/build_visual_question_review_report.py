"""Build an honest progress report from the separate visual-review records."""
from pathlib import Path
from collections import Counter
import json

rows = []
totals = Counter()
for order in range(1, 50):
    review = json.loads((Path("data/visual-review") / f"reading-{order:02d}.json").read_text(encoding="utf-8"))
    questions = review["questions"]
    verified = sum(question["visualReviewStatus"] == "verified" for question in questions)
    requires_review = sum(question["visualReviewStatus"] == "requires_review" for question in questions)
    totals[review["visualQuestionReviewStatus"]] += 1
    totals["realQuestions"] += len(questions)
    totals["visuallyVerifiedQuestions"] += verified
    totals["questionRequiresReview"] += requires_review
    rows.append({
        "readingId": review["readingId"],
        "sourcePages": review["sourcePageRange"],
        "visualQuestionReviewStatus": review["visualQuestionReviewStatus"],
        "questionsDetected": len(questions),
        "questionsVisuallyVerified": verified,
        "requiresReview": requires_review,
        "duplicateTechnicalRecordsRemoved": review["duplicateTechnicalRecordsRemoved"],
    })

report = {
    "source": "القطع النماذج ال 49.pdf",
    "scope": "Visual review only. Correct answers, scoring, timer, and results are excluded.",
    "summary": {
        "readings": 49,
        "notStarted": totals["not_started"],
        "inProgress": totals["in_progress"],
        "verified": totals["verified"],
        "requiresReview": totals["requires_review"],
        "realQuestions": totals["realQuestions"],
        "visuallyVerifiedQuestions": totals["visuallyVerifiedQuestions"],
        "questionRequiresReview": totals["questionRequiresReview"],
    },
    "readings": rows,
}
Path("data/visual-question-review-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report["summary"], ensure_ascii=False))
