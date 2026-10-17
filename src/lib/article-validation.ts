import { z } from 'zod';
import { normalizeDoi, isValidDoi } from './identifiers';
import { findSubject } from './subjects';

export const articleBaseSchema = z.object({
  title_uz: z.string().trim().min(5, 'O‘zbekcha sarlavha kamida 5 ta belgidan iborat bo‘lishi kerak'),
  title_en: z.string().optional(),
  title_ru: z.string().optional(),
  abstract_uz: z.string().trim().min(20, 'O‘zbekcha annotatsiya kamida 20 ta belgidan iborat bo‘lishi kerak'),
  abstract_en: z.string().optional(),
  abstract_ru: z.string().optional(),
  keywords_uz: z.array(z.string().trim().min(1)).min(1, 'Kamida bitta kalit so‘z kiritilishi kerak'),
  keywords_en: z.array(z.string().trim().min(1)).optional(),
  keywords_ru: z.array(z.string().trim().min(1)).optional(),
  original_language: z.enum(['uz', 'en', 'ru']).default('uz'),
  article_type: z.enum(['original_research', 'review', 'short_communication', 'case_study']).default('original_research'),
  status: z.enum(['draft', 'under_review', 'approved', 'published', 'rejected', 'withdrawn', 'archived']).default('draft'),
  issue_id: z.string().optional(),
  subject_id: z.string().refine(value => value === 'auto' || Boolean(findSubject(value)), 'Noto‘g‘ri fan yo‘nalishi').optional(),
  page_first: z.number().int().positive().optional(),
  page_last: z.number().int().positive().optional(),
  doi: z.string().trim().transform(normalizeDoi).refine(value => !value || isValidDoi(value), 'DOI formati noto‘g‘ri: 10.xxxx/identifier').optional(),
  publication_date: z.iso.date().optional(),
  license: z.string().trim().min(1).max(100).default('CC BY 4.0'),
  references_list: z.array(z.string()).default([]),
  authors: z.array(z.object({
    id: z.string(),
    article_id: z.string(),
    full_name: z.string().trim().min(2, 'Muallif ismi kiritilishi shart'),
    email: z.string().email().optional().or(z.literal('')),
    affiliation: z.string().trim().min(2, 'Tashkilot nomi kiritilishi shart'),
    country: z.string().default('O‘zbekiston'),
    orcid: z.string().optional(),
    is_corresponding: z.boolean().default(false),
    order_index: z.number().default(1),
  })).min(1, 'Kamida bitta muallif kiritilishi shart'),
});

export const articleSchema = articleBaseSchema.refine(article => article.page_first === undefined || article.page_last === undefined || article.page_last >= article.page_first, { message: 'Oxirgi sahifa birinchi sahifadan kichik bo‘lishi mumkin emas', path: ['page_last'] });
export const articleUpdateSchema = articleBaseSchema.partial().strict();
export const articleClearFields = z.array(z.enum(['issue_id', 'page_first', 'page_last', 'doi', 'publication_date', 'title_en', 'title_ru', 'abstract_en', 'abstract_ru'])).max(9).default([]);
