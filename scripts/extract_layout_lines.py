from pathlib import Path
import json
import pdfplumber

SOURCE = Path(r"C:\Users\waehs\Downloads\القطع النماذج ال 49.pdf")
DESTINATION = Path("data/layout-lines.json")

def group_lines(words, tolerance=4):
    lines = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not lines or abs(word["top"] - lines[-1]["top"]) > tolerance:
            lines.append({"top": word["top"], "words": [word]})
        else:
            lines[-1]["words"].append(word)
    return [
        {
            "top": round(line["top"], 2),
            "text": " ".join(word["text"] for word in sorted(line["words"], key=lambda item: item["x0"])),
            "x0": round(min(word["x0"] for word in line["words"]), 2),
            "x1": round(max(word["x1"] for word in line["words"]), 2),
        }
        for line in lines
    ]

pages = []
with pdfplumber.open(SOURCE) as pdf:
    for number, page in enumerate(pdf.pages, start=1):
        words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
        pages.append({"page": number, "width": page.width, "height": page.height, "lines": group_lines(words)})

DESTINATION.parent.mkdir(parents=True, exist_ok=True)
DESTINATION.write_text(json.dumps({"pages": pages}, ensure_ascii=False), encoding="utf-8")
print(f"Extracted coordinate-aware lines for {len(pages)} pages.")
