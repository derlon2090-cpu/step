import { chatWithQuestionTutor, questionTutorSchema } from '../server/services/ai/questionTutor.js';

export default async function handler(req, res) {
  const allowedOrigins = new Set((process.env.FRONTEND_ORIGINS ?? 'https://www.nabahah.com,https://nabahah.com').split(',').map((origin) => origin.trim()).filter(Boolean));
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('vary', 'Origin');
  }
  res.setHeader('access-control-allow-headers', 'content-type, accept');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const payload = questionTutorSchema.parse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {});
    const result = await chatWithQuestionTutor(payload);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.name === 'ZodError' ? 422 : Number.isInteger(error?.status) ? error.status : 502;
    res.status(status).json({ error: status === 422 ? 'Invalid tutor request' : 'Tutor service unavailable', code: error?.code });
  }
}
