import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = path.join(root, 'src', 'data', 'reading', 'models');
const sql = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL, { prepare: false }) : null;
if (!sql) throw new Error('DATABASE_URL is required. Importer never falls back to a local or fake database.');

const files = (await fs.readdir(inputDir)).filter((file) => /^model-\d+\.json$/.test(file)).sort();
const stats = { models: 0, pieces: 0, questions: 0, options: 0, verified: 0, missing: 0, needsReview: 0, excluded: 0, errors: [] };

await sql.begin(async (tx) => {
  for (const file of files) {
    const model = JSON.parse(await fs.readFile(path.join(inputDir, file), 'utf8'));
    if (!Number.isInteger(model.modelNumber) || !Array.isArray(model.pieces)) throw new Error(`${file}: modelNumber and pieces are required`);
    const modelSourceId = `model-${String(model.modelNumber).padStart(2, '0')}`;
    const [modelRow] = await tx`INSERT INTO learning_models (source_id, model_number, title_ar, title_en, skill, status)
      VALUES (${modelSourceId}, ${model.modelNumber}, ${model.title ?? null}, ${model.titleEn ?? null}, 'reading', 'published')
      ON CONFLICT (source_id) DO UPDATE SET model_number=EXCLUDED.model_number, title_ar=EXCLUDED.title_ar, title_en=EXCLUDED.title_en, updated_at=now()
      RETURNING id`;
    stats.models++;
    for (const [pieceIndex, piece] of model.pieces.entries()) {
      if (!piece.pieceId || !Array.isArray(piece.questions)) throw new Error(`${file} piece ${pieceIndex + 1}: pieceId and questions are required`);
      const [pieceRow] = await tx`INSERT INTO learning_pieces (source_id, model_id, piece_order, title_ar, title_en, passage_source, passage_display, source_note, status)
        VALUES (${piece.pieceId}, ${modelRow.id}, ${piece.order ?? pieceIndex + 1}, ${piece.titleAr ?? null}, ${piece.titleEn ?? null}, ${piece.passage ?? null}, ${piece.passage ?? null}, ${Array.isArray(piece.sourceNotes) ? piece.sourceNotes.join('\n') : piece.sourceNote ?? null}, 'published')
        ON CONFLICT (source_id) DO UPDATE SET model_id=EXCLUDED.model_id, piece_order=EXCLUDED.piece_order, title_ar=EXCLUDED.title_ar, title_en=EXCLUDED.title_en, passage_source=EXCLUDED.passage_source, passage_display=EXCLUDED.passage_display, source_note=EXCLUDED.source_note, updated_at=now()
        RETURNING id`;
      stats.pieces++;
      for (const [questionIndex, question] of piece.questions.entries()) {
        const correct = typeof question.correctAnswer === 'string' && question.correctAnswer.trim() ? question.correctAnswer.trim() : null;
        const status = question.answerStatus === 'needs_review' ? 'needs_review' : correct ? 'verified' : 'missing';
        const excluded = Boolean(question.excludeFromScoring ?? !correct);
        if (!correct && !excluded) stats.errors.push(`${question.id}: correctAnswer is null but excludeFromScoring is false`);
        const [questionRow] = await tx`INSERT INTO questions (source_id, piece_id, model_id, skill, question_order, question_source, question_display, correct_answer, answer_status, exclude_from_scoring, source_note)
          VALUES (${question.id}, ${pieceRow.id}, ${modelRow.id}, 'reading', ${question.displayOrder ?? questionIndex + 1}, ${question.questionSource ?? question.questionDisplay ?? ''}, ${question.questionDisplay ?? question.questionSource ?? ''}, ${correct}, ${status}, ${excluded}, ${question.sourceNote ?? null})
          ON CONFLICT (source_id) DO UPDATE SET piece_id=EXCLUDED.piece_id, model_id=EXCLUDED.model_id, question_order=EXCLUDED.question_order, question_source=EXCLUDED.question_source, question_display=EXCLUDED.question_display, correct_answer=EXCLUDED.correct_answer, answer_status=EXCLUDED.answer_status, exclude_from_scoring=EXCLUDED.exclude_from_scoring, source_note=EXCLUDED.source_note, updated_at=now()
          RETURNING id`;
        await tx`DELETE FROM question_options WHERE question_id=${questionRow.id}`;
        const options = Array.isArray(question.options) ? question.options : [];
        for (const [optionIndex, value] of options.entries()) {
          await tx`INSERT INTO question_options (question_id, option_order, value, is_correct) VALUES (${questionRow.id}, ${optionIndex + 1}, ${String(value)}, NULL)`;
          stats.options++;
        }
        stats.questions++;
        if (status === 'verified') stats.verified++; else if (status === 'needs_review') stats.needsReview++; else stats.missing++;
        if (excluded) stats.excluded++;
      }
    }
  }
});
await sql.end();
console.log(JSON.stringify({ ...stats, errors: stats.errors }, null, 2));
if (stats.errors.length) process.exitCode = 2;

