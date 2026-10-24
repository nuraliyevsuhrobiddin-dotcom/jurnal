import { z } from 'zod';

export const coauthorSchema = z.object({
  full_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254).or(z.literal('')).optional(),
  affiliation: z.string().trim().min(2).max(500),
  country: z.string().trim().min(2).max(100),
});

export const manuscriptSubmissionSchema = z.object({
  title: z.string().trim().min(5).max(500),
  abstract: z.string().trim().min(50).max(10000),
  keywords: z.string().trim().min(2).max(1000).refine(value => value.split(/[,;]/).some(word => word.trim().length > 1)),
  author_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254),
  affiliation: z.string().trim().min(2).max(500),
  country: z.string().trim().min(2).max(100),
  lang: z.literal('en', { error: 'Only English manuscripts are accepted.' }),
  consent: z.literal('true'),
  original: z.literal('true'),
  reviewed: z.literal('true', { error: 'Review the submission and confirm that it is in English.' }),
  coauthors: z.array(coauthorSchema).max(30).default([]),
}).superRefine((data, context) => {
  // A downloaded template is a starting point, not a completed submission.
  for (const field of ['title', 'abstract', 'keywords', 'author_name', 'email', 'affiliation', 'country'] as const) {
    if (/^replace (?:this|with)\b/i.test(data[field]) || data[field] === 'author@example.org' || data[field] === 'first keyword, second keyword, third keyword') {
      context.addIssue({ code: 'custom', path: [field], message: 'Replace the template examples with your manuscript details.' });
    }
  }
});
