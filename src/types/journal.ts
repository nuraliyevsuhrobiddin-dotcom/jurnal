export type Language = 'uz' | 'en' | 'ru';

export type ArticleStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'withdrawn'
  | 'archived';

export type ArticleType =
  | 'original_research'
  | 'review'
  | 'short_communication'
  | 'case_study';

export interface ArticleAuthor {
  id: string;
  article_id: string;
  full_name: string;
  email?: string;
  affiliation: string;
  country: string;
  orcid?: string;
  is_corresponding: boolean;
  order_index: number;
  created_at?: string;
}

export interface Article {
  id: string;
  slug: string;
  issue_id?: string;
  subject_id?: string;
  original_language: Language;

  // Multilingual titles
  title_uz: string;
  title_en?: string;
  title_ru?: string;

  // Multilingual abstracts
  abstract_uz: string;
  abstract_en?: string;
  abstract_ru?: string;

  // Multilingual keywords
  keywords_uz: string[];
  keywords_en?: string[];
  keywords_ru?: string[];

  article_type: ArticleType;
  status: ArticleStatus;
  publication_date?: string;
  first_published_at?: string;
  revision?: number;
  change_note?: string;
  pdf_storage_path?: string;
  page_first?: number;
  page_last?: number;
  doi?: string;
  license: string;
  references_list: string[];

  manuscript_file_url?: string;
  pdf_url?: string;
  pdf_file_size?: number;

  views_count: number;
  downloads_count: number;

  submission_notes?: string;
  retraction_reason?: string;

  created_at: string;
  updated_at: string;

  // Joined fields
  authors?: ArticleAuthor[];
  issue?: Issue;
}

export interface Issue {
  id: string;
  volume: number;
  issue_number: number;
  year: number;
  title_uz?: string;
  title_en?: string;
  title_ru?: string;
  description_uz?: string;
  description_en?: string;
  description_ru?: string;
  publication_date: string;
  is_current: boolean;
  cover_image_url?: string;
  full_pdf_url?: string;
  toc_pdf_url?: string;
  articles_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionSummary {
  issue_id: string;
  subject_id: string;
  published_count: number;
  released_at: string | null;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  revision: number;
  created_at: string;
  change_note: string;
  snapshot: Article;
  pdf_storage_path?: string;
}

export interface EditorialBoardMember {
  id: string;
  full_name: string;
  academic_title?: string;
  academic_degree?: string;
  affiliation: string;
  country: string;
  email?: string;
  orcid?: string;
  role: 'editor_in_chief' | 'deputy_editor' | 'editorial_board_member' | 'scientific_secretary' | 'managing_editor';
  order_index: number;
  is_active: boolean;
  created_at?: string;
}

export interface Certificate {
  id: string;
  certificate_number: string;
  article_id: string;
  author_name: string;
  author_affiliation?: string;
  article_title: string;
  journal_name: string;
  issue_volume: number;
  issue_number: number;
  issue_year: number;
  issue_date: string;
  verification_code: string;
  qr_code_data_url?: string;
  pdf_url?: string;
  status: 'valid' | 'revoked';
  revoked_reason?: string;
  revoked_at?: string;
  created_at: string;
}

export interface JournalSettings {
  journal_name: string;
  tagline: string;
  publisher: string;
  issn_print?: string;
  issn_online?: string;
  established_year: number;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  doi_prefix?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}
