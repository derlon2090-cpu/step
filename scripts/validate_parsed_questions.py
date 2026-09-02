from pathlib import Path
import json
import re

compact = lambda value: re.sub(r"\s+", " ", value).strip()

for number in range(1, 50):
    source = json.loads((Path("data/extraction") / f"reading-{number:02d}.json").read_text(encoding="utf-8"))
    parsed = json.loads((Path("data/questions") / f"reading-{number:02d}.json").read_text(encoding="utf-8"))
    assert parsed["readingId"] == source["id"]
    assert [question["order"] for question in parsed["questions"]] == list(range(1, len(parsed["questions"]) + 1))
    assert all(question["correctAnswer"] is None and question["answerStatus"] == "missing" for question in parsed["questions"])
    for question in parsed["questions"]:
        assert question["questionText"] in compact(source["source_content"])
        assert all(line in source["source_content"] for line in question["rawBlock"].splitlines())
        assert all(option["text"] in question["rawBlock"] for option in question["options"])
        assert question["visualVerificationStatus"] == "requires_review"
        if question["parseStatus"] == "textually_verified":
            assert len(question["options"]) >= 2
        else:
            assert question["options"] == [] and question["reviewReason"]
print("Parsed-question validation passed for 49 readings; all derived text remains traceable to source_content.")
