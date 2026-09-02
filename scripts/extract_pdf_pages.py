from pathlib import Path
from pypdf import PdfReader
import json

source = Path(r"C:\Users\waehs\Downloads\القطع النماذج ال 49.pdf")
destination = Path("tmp/pdfs/pages.json")
reader = PdfReader(source)
pages = []
for index, page in enumerate(reader.pages, start=1):
    pages.append({"page": index, "text": page.extract_text() or ""})

destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps({"page_count": len(pages), "pages": pages}, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"page_count": len(pages), "empty_pages": sum(not item["text"].strip() for item in pages)}, ensure_ascii=False))
