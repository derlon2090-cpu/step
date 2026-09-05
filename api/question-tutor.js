import { chatWithQuestionTutor, questionTutorSchema } from '../server/services/ai/questionTutor.js';

export default async function handler(req, res) {
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
    const status = error?.name === 'ZodError' ? 422 : 502;
    res.status(status).json({ error: status === 422 ? 'Invalid tutor request' : 'Tutor service unavailable' });
  }
}
