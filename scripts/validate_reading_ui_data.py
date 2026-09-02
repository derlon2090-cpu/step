from pathlib import Path
import json

records = [json.loads((Path("data/extraction") / f"reading-{number:02d}.json").read_text(encoding="utf-8")) for number in range(1, 50)]
assert len(records) == 49
assert [record["id"] for record in records] == [f"reading-{number:02d}" for number in range(1, 50)]
assert all(record["questions"] is None for record in records)
assert all(record["answerKeyStatus"] == "missing" for record in records)
assert all(record["source_content"] for record in records)
print("UI data source validated: 49 original records, no inferred question objects or answer keys.")
