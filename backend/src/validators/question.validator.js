import { z } from 'zod';

export const createQuestionSchema = {
  body: z.object({
    question: z
      .string({ required_error: 'Question is required' })
      .trim()
      .min(3, 'Question must be at least 3 characters long')
      .max(1000, 'Question cannot exceed 1000 characters'),
  }),
};

export const answerQuestionSchema = {
  body: z.object({
    answer: z
      .string({ required_error: 'Answer is required' })
      .trim()
      .min(1, 'Answer cannot be empty')
      .max(2000, 'Answer cannot exceed 2000 characters'),
  }),
};

export const officialAnswerSchema = {
  body: z.object({
    isOfficialAnswer: z.boolean({ required_error: 'Official answer flag is required' }),
  }),
};

export const listQuestionsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.enum(['newest', 'oldest']).optional().default('newest'),
    q: z.string().optional(),
  }),
};
