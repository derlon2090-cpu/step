import pdfplumber

source = r"C:\Users\waehs\Downloads\القطع النماذج ال 49.pdf"
with pdfplumber.open(source) as pdf:
    page = pdf.pages[4]
    words = page.extract_words(use_text_flow=False)
    print("WORDS", len(words))
    for word in sorted(words, key=lambda item: (item["top"], item["x0"]))[30:150]:
        print(round(word["top"]), round(word["x0"]), round(word["x1"]), word["text"])
