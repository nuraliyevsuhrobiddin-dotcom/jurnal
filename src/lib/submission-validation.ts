import { z } from 'zod';

export const manuscriptSubmissionSchema = z.object({
  title: z.string().trim().min(5).max(500),
  abstract: z.string().trim().min(50).max(10000),
  keywords: z.string().trim().min(2).max(1000).refine(value => value.split(/[,;]/).some(word => word.trim().length > 1)),
  author_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254),
  affiliation: z.string().trim().min(2).max(500),
  country: z.string().trim().min(2).max(100),
  lang: z.enum(['uz', 'en', 'ru']),
  consent: z.literal('true'),
  original: z.literal('true'),
});
