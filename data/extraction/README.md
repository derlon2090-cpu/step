# STEP Reading source inventory

This folder is a read-only extraction index for `القطع النماذج ال 49.pdf`.

- `reading-01.json` through `reading-49.json` preserve the extracted source pages for the 49 sequential source models. A complete model is one reading record; internal headings do not create additional records.
- `title_index_source_lines` is copied from the source model's title/index page without inferred names.
- `source_content` and `source_pages` preserve the question and option text in source order after repeating headers, links, and attribution lines were excluded.
- `arabicTitle` is the Arabic model heading exactly as extracted from its source title page. Where it is absent, `arabicTitle` is null and `internalArabicLabel` is an internal label only. `title_index_source_lines` retains the internal headings in order.
- `contentStatus` and `questionStatus` are `verified` when all pages in the assigned contiguous range have been preserved in source order. Options are not reordered or inferred; they remain in `source_content` and `question_source_blocks` exactly in that source order.
- `questions` is intentionally null rather than an empty list: question content exists in the preserved source blocks but has not been normalized into question objects, because doing so could falsely assert option-to-question or answer-key relationships.
- No standalone answer key could be reliably identified, so `answerKeyStatus` is `missing`. No correct answer has been inferred.

No UI consumes these records. `data/extraction-report.json` is the phase-one validation report.

## Question-boundary recovery (separate derived layer)

`data/questions-layout/` is deliberately separate from this source inventory.
It records clean English lines ending in a question mark by using the page's
word coordinates, which avoids copying a neighbouring answer or Arabic
translation into the question text. It does **not** establish that every
candidate is a real question, does not reconstruct options, and does not infer
answers. Every candidate has `visualVerificationStatus: "requires_review"`.

`data/question-layout-recovery-report.json` reports geometry-bounded candidates
and the subset with a conventional English interrogative signal. These counts
are review worklists, not published question counts. The student UI filters
strictly on `visualVerificationStatus === "verified"`, so none of these
candidates can leak into the learning experience before visual confirmation.
