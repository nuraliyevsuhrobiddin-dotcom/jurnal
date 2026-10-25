import { journalStore } from './data-store';
import { randomUUID } from 'node:crypto';
import { isValidIssn } from './identifiers';
import { assertPublicationReady, assertIssuePageRangeAvailable, PublicationError } from './publication-ready';
import { distinctEditorialMembers } from './editorial-members';
import { isServerSupabaseConfigured, createServerClient } from './supabase/server';
import { normalizeRemoteArticle, remoteArticles, remoteRows, remoteSave, remoteSaveArticle, remoteSaveIssue, remoteSettings, remoteSaveSettings } from './remote-db';

import {
  Article,
  Issue,
  EditorialBoardMember,
  Certificate,
  JournalSettings,
  AuditLog,
  ArticleStatus
} from '@/types/journal';

// ============================================================================
// ARTICLES API
// ============================================================================

function normalizedSearch(value: string) {
  return value.toLocaleLowerCase().replace(/[‘’ʻʼ`']/g, '').trim();
}

function matchesArticle(article: Article, query: string) {
  const text = [article.title_uz, article.title_en, article.title_ru,
    article.abstract_uz, article.abstract_en, article.abstract_ru,
    ...(article.keywords_uz || []), ...(article.keywords_en || []), ...(article.keywords_ru || []),
    ...(article.authors || []).map(author => author.full_name)].filter(Boolean).join(' ');
  return normalizedSearch(text).includes(normalizedSearch(query));
}

export async function getPublishedArticles(params?: {
  query?: string;
  issueId?: string;
  limit?: number;
}): Promise<Article[]> {
  journalStore.refresh();
  const supabase = createServerClient();

  if (isServerSupabaseConfigured && supabase) {
    let queryBuilder = supabase
      .from('articles')
      .select('*, authors:article_authors(*), issue:issues(*)')
      .eq('status', 'published')
      .order('publication_date', { ascending: false }).order('id');

    if (params?.issueId) {
      queryBuilder = queryBuilder.eq('issue_id', params.issueId);
    }

    if (params?.limit && !params?.query) {
      queryBuilder = queryBuilder.limit(params.limit);
    }

    const data: Article[] = [];
    const batchSize = params?.limit && !params.query ? Math.min(params.limit, 500) : 500;
    for (let offset = 0; ; offset += batchSize) {
      const result = await queryBuilder.range(offset, offset + batchSize - 1);
      if (result.error) throw new Error(result.error.message);
      const batch = (result.data || []).map(row => normalizeRemoteArticle(row as Article));
      data.push(...batch);
      if (batch.length < batchSize || (params?.limit && !params.query && data.length >= params.limit)) break;
    }
    if (data) {
      if (params?.query) {
        const matches = (data as Article[]).filter(a => matchesArticle(a, params.query!));
        return params.limit ? matches.slice(0, params.limit) : matches;
      }
      return params?.limit ? data.slice(0, params.limit) : data;
    }
  }

  // Fallback / In-Memory Store
  let results = journalStore.articles.filter(a => a.status === 'published');

  if (params?.issueId) {
    results = results.filter(a => a.issue_id === params.issueId);
  }

  if (params?.query) {
    results = results.filter(a => matchesArticle(a, params.query!));
  }

  // Attach issue details if available
  results = results.sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || '')).map(article => ({
    ...article,
    issue: journalStore.issues.find(i => i.id === article.issue_id),
  }));

  if (params?.limit) {
    results = results.slice(0, params.limit);
  }

  return results;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  journalStore.refresh();
  const supabase = createServerClient();
  if (isServerSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('articles')
      .select('*, authors:article_authors(*), issue:issues(*)')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw new Error(error.message);
    else return data ? normalizeRemoteArticle(data as Article) : null;
  }

  const article = journalStore.articles.find(a => a.slug === slug && a.status === 'published');
  if (!article) return null;

  return {
    ...article,
    issue: journalStore.issues.find(i => i.id === article.issue_id),
  };
}

export async function getArticleById(id: string): Promise<Article | null> {
  journalStore.refresh();
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.from('articles').select('*, authors:article_authors(*), issue:issues(*)').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? normalizeRemoteArticle(data as Article) : null;
  }
  const article = journalStore.articles.find(a => a.id === id);
  if (!article) return null;
  return {
    ...article,
    issue: journalStore.issues.find(i => i.id === article.issue_id),
  };
}

export async function getAllArticlesAdmin(): Promise<Article[]> {
  journalStore.refresh();
  const supabase = createServerClient();
  if (isServerSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('articles')
      .select('*, authors:article_authors(*), issue:issues(*)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    else return (data as Article[]).map(normalizeRemoteArticle);
  }

  return journalStore.articles.map(article => ({
    ...article,
    issue: journalStore.issues.find(i => i.id === article.issue_id),
  }));
}

export async function createArticle(data: Omit<Article, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'downloads_count'>): Promise<Article> {
  if (data.status === 'published') throw new PublicationError('Avval maqolani qoralama sifatida saqlang, jurnal soni va PDF faylini tayyorlang.');
  journalStore.refresh();
  const newId = randomUUID();
  const client = createServerClient();
  let slugExists: boolean;
  if (client) {
    const { data: existing, error } = await client.from('articles').select('id').eq('slug', data.slug).maybeSingle();
    if (error) throw new Error(error.message);
    slugExists = Boolean(existing);
  } else slugExists = journalStore.articles.some(article => article.slug === data.slug);
  if (slugExists) {
    data = { ...data, slug: `${data.slug}-${newId.slice(0, 8)}` };
  }
  if (data.issue_id && !(await getIssueById(data.issue_id))) throw new Error('Jurnal soni topilmadi');
  const now = new Date().toISOString();

  const created: Article = {
    ...data,
    id: newId,
    views_count: 0,
    downloads_count: 0,
    publication_date: data.status === 'published' ? data.publication_date || now.split('T')[0] : data.publication_date,
    created_at: now,
    updated_at: now,
    authors: (data.authors || []).map(author => ({ ...author, article_id: newId })),
    keywords_en: data.keywords_en || [],
    keywords_ru: data.keywords_ru || [],
  };

  if (!(await remoteSaveArticle(created))) {
    journalStore.articles.unshift(created);
  }
  journalStore.persist();

  await logAudit('ARTICLE_CREATE', 'article', created.id, { title: created.title_uz, status: created.status });
  return created;
}

export async function updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
  const previous = await getArticleById(id);
  if (!previous) return null;
  if ((updates.status || previous.status) === 'published') {
    const issueId = Object.hasOwn(updates, 'issue_id') ? updates.issue_id : previous.issue_id;
    const issue = issueId ? await getIssueById(issueId) : undefined;
    const candidate = { ...previous, ...updates, issue: issue || undefined };
    await assertPublicationReady(candidate);
    if (previous.status !== 'published' || candidate.issue_id !== previous.issue_id
      || candidate.page_first !== previous.page_first || candidate.page_last !== previous.page_last) {
      assertIssuePageRangeAvailable(candidate, await getPublishedArticles({ issueId }));
    }
  }
  journalStore.refresh();
  if (createServerClient()) {
    const updated = { ...previous, ...updates, id, created_at: previous.created_at, updated_at: new Date().toISOString() };
    await remoteSaveArticle(updated);
    await logAudit('ARTICLE_UPDATE', 'article', id, { updates });
    return updated;
  }
  const index = journalStore.articles.findIndex(a => a.id === id);
  if (index === -1) return null;

  const current = journalStore.articles[index];
  const updated: Article = {
    ...current,
    ...updates,
    id: current.id,
    created_at: current.created_at,
    updated_at: new Date().toISOString(),
  };

  journalStore.articles[index] = updated;
  journalStore.persist();
  await logAudit('ARTICLE_UPDATE', 'article', id, { updates });
  return updated;
}

export async function updateArticleStatus(id: string, newStatus: ArticleStatus, retractionReason?: string): Promise<Article | null> {
  if (newStatus === 'published') return updateArticle(id, { status: newStatus, publication_date: (await getArticleById(id))?.publication_date || new Date().toISOString().slice(0, 10) });
  journalStore.refresh();
  if (createServerClient()) {
    const current = await getArticleById(id);
    if (!current) return null;
    return updateArticle(id, { status: newStatus, retraction_reason: retractionReason || current.retraction_reason,
      publication_date: current.publication_date });
  }
  const index = journalStore.articles.findIndex(a => a.id === id);
  if (index === -1) return null;

  const current = journalStore.articles[index];
  const updated: Article = {
    ...current,
    status: newStatus,
    retraction_reason: retractionReason || current.retraction_reason,
    publication_date: current.publication_date,
    updated_at: new Date().toISOString(),
  };

  journalStore.articles[index] = updated;
  journalStore.persist();
  await logAudit('ARTICLE_STATUS_CHANGE', 'article', id, { oldStatus: current.status, newStatus });
  return updated;
}

export async function deleteArticle(id: string): Promise<boolean> {
  journalStore.refresh();
  const supabase = createServerClient();
  if (isServerSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('articles').delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) return false;
    await logAudit('ARTICLE_DELETE', 'article', id);
    return true;
  }
  const index = journalStore.articles.findIndex(a => a.id === id);
  if (index !== -1) {
    const [removed] = journalStore.articles.splice(index, 1);
    journalStore.persist();
    await logAudit('ARTICLE_DELETE', 'article', id, { title: removed.title_uz });
    return true;
  }
  return false;
}

// ============================================================================
// ISSUES API
// ============================================================================

export async function getCurrentIssue(): Promise<Issue | null> {
  journalStore.refresh();
  const remote = await remoteRows<Issue>('issues');
  if (remote) return remote.find(issue => issue.is_current) || remote.sort((a, b) => b.publication_date.localeCompare(a.publication_date))[0] || null;

  const current = journalStore.issues.find(i => i.is_current);
  return current || journalStore.issues[0] || null;
}

export async function getAllIssues(): Promise<Issue[]> {
  journalStore.refresh();
  const remote = await remoteRows<Issue>('issues');
  if (remote) return remote.sort((a, b) => b.year - a.year || b.volume - a.volume || b.issue_number - a.issue_number);

  return [...journalStore.issues].sort((a, b) => b.year - a.year || b.issue_number - a.issue_number);
}

export async function getIssueById(id: string): Promise<Issue | null> {
  journalStore.refresh();
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.from('issues').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Issue | null;
  }
  const issue = journalStore.issues.find(i => i.id === id);
  return issue || null;
}

export async function createIssue(data: Omit<Issue, 'id' | 'created_at' | 'updated_at'>): Promise<Issue> {
  journalStore.refresh();
  if ((await getAllIssues()).some(issue => issue.volume === data.volume && issue.issue_number === data.issue_number && issue.year === data.year)) {
    throw new Error('Bu jild, son va yil allaqachon mavjud');
  }
  const newId = randomUUID();
  const now = new Date().toISOString();

  if (data.is_current && !isServerSupabaseConfigured) {
    journalStore.issues.forEach(i => { i.is_current = false; });
  }

  const created: Issue = {
    ...data,
    id: newId,
    articles_count: 0,
    created_at: now,
    updated_at: now,
  };

  if (!(await remoteSaveIssue(created))) {
    journalStore.issues.unshift(created);
  }
  journalStore.persist();
  await logAudit('ISSUE_CREATE', 'issue', created.id, { volume: created.volume, issue: created.issue_number, year: created.year });
  return created;
}

export async function updateIssue(id: string, updates: Partial<Omit<Issue, 'id' | 'created_at' | 'articles_count'>>): Promise<Issue | null> {
  journalStore.refresh();
  const remote = await remoteRows<Issue>('issues');
  const current = (remote || journalStore.issues).find(issue => issue.id === id);
  if (!current) return null;
  if (current.is_current && updates.is_current === false) {
    throw new Error('Joriy sonni almashtirish uchun boshqa sonni joriy deb belgilang.');
  }

  const updated: Issue = { ...current, ...updates, id, created_at: current.created_at, updated_at: new Date().toISOString() };
  if (remote) {
    await remoteSaveIssue(updated);
  } else {
    if (updated.is_current) journalStore.issues.forEach(issue => { if (issue.id !== id) issue.is_current = false; });
    const index = journalStore.issues.findIndex(issue => issue.id === id);
    journalStore.issues[index] = updated;
    journalStore.persist();
  }
  await logAudit('ISSUE_UPDATE', 'issue', id, { volume: updated.volume, issue: updated.issue_number, year: updated.year, cover_image_url: updated.cover_image_url });
  return updated;
}

export async function deleteIssue(id: string): Promise<boolean> {
  journalStore.refresh();
  const supabase = createServerClient();
  if (isServerSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('issues').delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) return false;
    await logAudit('ISSUE_DELETE', 'issue', id);
    return true;
  }
  const index = journalStore.issues.findIndex(issue => issue.id === id);
  if (index !== -1) {
    const [removed] = journalStore.issues.splice(index, 1);
    journalStore.persist();
    await logAudit('ISSUE_DELETE', 'issue', id, { volume: removed.volume, issue: removed.issue_number, year: removed.year });
    return true;
  }
  return false;
}

// ============================================================================
// EDITORIAL BOARD
// ============================================================================

export async function getEditorialBoard(): Promise<EditorialBoardMember[]> {
  journalStore.refresh();
  const remote = await remoteRows<EditorialBoardMember>('editorial_board');
  if (remote) return distinctEditorialMembers(remote.filter(member => member.is_active).sort((a, b) => a.order_index - b.order_index));

  return distinctEditorialMembers(journalStore.editorialBoard.filter(member => member.is_active).sort((a, b) => a.order_index - b.order_index));
}

export async function getAllEditorialBoardMembers(): Promise<EditorialBoardMember[]> {
  journalStore.refresh();
  const remote = await remoteRows<EditorialBoardMember>('editorial_board');
  const members = remote || journalStore.editorialBoard;
  return [...members].sort((a, b) => a.order_index - b.order_index || a.full_name.localeCompare(b.full_name));
}

export type EditorialBoardMemberInput = Omit<EditorialBoardMember, 'id' | 'created_at'>;

export async function createEditorialBoardMember(data: EditorialBoardMemberInput): Promise<EditorialBoardMember> {
  journalStore.refresh();
  const now = new Date().toISOString();
  const member: EditorialBoardMember = { ...data, id: randomUUID(), created_at: now };
  if (!(await remoteSave('editorial_board', member))) {
    journalStore.editorialBoard.push(member);
    journalStore.persist();
  }
  await logAudit('EDITORIAL_MEMBER_CREATE', 'editorial_board', member.id, { full_name: member.full_name, role: member.role });
  return member;
}

export async function updateEditorialBoardMember(id: string, updates: EditorialBoardMemberInput): Promise<EditorialBoardMember | null> {
  journalStore.refresh();
  const remote = await remoteRows<EditorialBoardMember>('editorial_board');
  const members = remote || journalStore.editorialBoard;
  const current = members.find(member => member.id === id);
  if (!current) return null;
  const updated: EditorialBoardMember = { ...current, ...updates, id, created_at: current.created_at };
  if (!(await remoteSave('editorial_board', updated))) {
    const index = journalStore.editorialBoard.findIndex(member => member.id === id);
    if (index < 0) return null;
    journalStore.editorialBoard[index] = updated;
    journalStore.persist();
  }
  await logAudit('EDITORIAL_MEMBER_UPDATE', 'editorial_board', id, { full_name: updated.full_name, role: updated.role, is_active: updated.is_active });
  return updated;
}

export async function deleteEditorialBoardMember(id: string): Promise<EditorialBoardMember | null> {
  const member = (await getAllEditorialBoardMembers()).find(item => item.id === id);
  if (!member) return null;
  const archived = await updateEditorialBoardMember(id, { ...member, is_active: false });
  if (archived) await logAudit('EDITORIAL_MEMBER_DEACTIVATE', 'editorial_board', id, { full_name: archived.full_name });
  return archived;
}

// ============================================================================
// CERTIFICATES API
// ============================================================================

export async function getCertificateByCode(code: string): Promise<Certificate | null> {
  journalStore.refresh();
  const normalized = code.trim().toUpperCase();
  const certificates = await remoteRows<Certificate>('certificates') || journalStore.certificates;
  const cert = certificates.find(
    c => c.certificate_number.toUpperCase() === normalized || c.verification_code.toUpperCase() === normalized
  );
  return cert || null;
}

export async function getAllCertificatesAdmin(): Promise<Certificate[]> {
  journalStore.refresh();
  const certificates = await remoteRows<Certificate>('certificates') || journalStore.certificates;
  return [...certificates].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createCertificate(data: {
  issuance_id?: string;
  article_id: string;
  author_name: string;
  author_affiliation?: string;
  article_title: string;
  issue_volume: number;
  issue_number: number;
  issue_year: number;
  issue_date?: string;
  qr_code_data_url?: string;
  verification_code?: string;
}): Promise<Certificate> {
  journalStore.refresh();
  const count = (await getAllCertificatesAdmin()).length + 1;
  const numFormatted = String(count).padStart(6, '0');
  const certNumber = `AGM-CERT-${data.issue_year || new Date().getFullYear()}-${data.issuance_id ? data.issuance_id.replace(/-/g, '').toUpperCase() : isServerSupabaseConfigured ? randomUUID().slice(0, 8).toUpperCase() : numFormatted}`;
  const verCode = data.verification_code || `AGM-VER-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

  const cert: Certificate = {
    id: data.issuance_id || randomUUID(),
    certificate_number: certNumber,
    article_id: data.article_id,
    author_name: data.author_name,
    author_affiliation: data.author_affiliation,
    article_title: data.article_title,
    journal_name: 'AGM Journal',
    issue_volume: data.issue_volume,
    issue_number: data.issue_number,
    issue_year: data.issue_year,
    issue_date: data.issue_date || new Date().toISOString().split('T')[0],
    verification_code: verCode,
    qr_code_data_url: data.qr_code_data_url,
    status: 'valid',
    created_at: new Date().toISOString(),
  };

  if (!(await remoteSave('certificates', cert))) {
    journalStore.certificates.unshift(cert);
  }
  journalStore.persist();
  await logAudit('CERTIFICATE_ISSUE', 'certificate', cert.id, { certificate_number: certNumber, author: data.author_name });
  return cert;
}

export async function revokeCertificate(id: string, reason: string): Promise<Certificate | null> {
  journalStore.refresh();
  const certificates = await remoteRows<Certificate>('certificates') || journalStore.certificates;
  const cert = certificates.find(c => c.id === id || c.certificate_number === id);
  if (!cert) return null;

  cert.status = 'revoked';
  cert.revoked_reason = reason;
  cert.revoked_at = new Date().toISOString();
  await remoteSave('certificates', cert);
  journalStore.persist();

  await logAudit('CERTIFICATE_REVOKE', 'certificate', cert.id, { certificate_number: cert.certificate_number, reason });
  return cert;
}

export async function deleteCertificate(id: string): Promise<boolean> {
  journalStore.refresh();
  const supabase = createServerClient();
  if (isServerSupabaseConfigured && supabase) {
    const certificate = (await remoteRows<Certificate>('certificates'))?.find(c => c.id === id || c.certificate_number === id);
    if (!certificate) return false;
    const { data, error } = await supabase.from('certificates').delete().eq('id', certificate.id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) return false;
    await logAudit('CERTIFICATE_DELETE', 'certificate', id);
    return true;
  }
  const index = journalStore.certificates.findIndex(c => c.id === id || c.certificate_number === id);
  if (index !== -1) {
    const [removed] = journalStore.certificates.splice(index, 1);
    journalStore.persist();
    await logAudit('CERTIFICATE_DELETE', 'certificate', id, { certificate_number: removed.certificate_number });
    return true;
  }
  return false;
}

// ============================================================================
// STATS & SETTINGS
// ============================================================================

export async function getJournalStats() {
  journalStore.refresh();
  const articles = await remoteArticles() || journalStore.articles;
  const issues = await remoteRows<Issue>('issues') || journalStore.issues;
  const certificates = await remoteRows<Certificate>('certificates') || journalStore.certificates;
  const publishedCount = articles.filter(a => a.status === 'published').length;
  const issuesCount = issues.length;
  const certificatesCount = certificates.length;
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const reviewCount = articles.filter(a => a.status === 'under_review').length;
  const approvedCount = articles.filter(a => a.status === 'approved').length;

  const totalAuthors = new Set(
    articles.flatMap(a => (a.authors || []).map(au => au.full_name))
  ).size;

  return {
    publishedArticles: publishedCount,
    draftArticles: draftCount,
    underReviewArticles: reviewCount,
    approvedArticles: approvedCount,
    totalArticles: articles.length,
    totalIssues: issuesCount,
    totalCertificates: certificatesCount,
    revokedCertificates: certificates.filter(c => c.status === 'revoked').length,
    scholarlyAuthors: totalAuthors,
    countriesCovered: new Set(articles.flatMap(a => (a.authors || []).map(author => author.country))).size,
  };
}

export async function getJournalSettings(): Promise<JournalSettings> {
  journalStore.refresh();
  const settings = await remoteSettings() || journalStore.settings;
  return { ...settings, issn_online: isValidIssn(settings.issn_online) ? settings.issn_online : undefined, issn_print: isValidIssn(settings.issn_print) ? settings.issn_print : undefined };
}

export async function updateJournalSettings(newSettings: Partial<JournalSettings>): Promise<JournalSettings> {
  journalStore.refresh();
  journalStore.settings = {
    ...await getJournalSettings(),
    ...newSettings,
  };
  await remoteSaveSettings(journalStore.settings);
  journalStore.persist();
  await logAudit('SETTINGS_UPDATE', 'journal_settings', 'general', { newSettings });
  return journalStore.settings;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export async function getAuditLogs(): Promise<AuditLog[]> {
  journalStore.refresh();
  const logs = await remoteRows<AuditLog>('audit_logs') || journalStore.auditLogs;
  return [...logs].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
  userEmail = 'admin@agmjoural.uz'
): Promise<void> {
  const log: AuditLog = {
    id: randomUUID(),
    user_email: userEmail,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString(),
  };
  try {
    if (!(await remoteSave('audit_logs', log))) {
      journalStore.auditLogs.unshift(log);
      journalStore.persist();
    }
  } catch {
    // Business writes have already committed. Returning a false save failure can
    // make callers delete their manuscript or retry a successful publication.
    console.error('Audit record could not be persisted:', { id: log.id, action, entityType, entityId });
  }
}
