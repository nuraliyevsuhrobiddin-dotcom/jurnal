'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Send, Upload } from 'lucide-react';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { applyManuscriptSuggestions, clearAutomaticFields, editManuscriptField, emptyManuscriptFields, manuscriptFieldNames, type ManuscriptField, type TrackedFields } from '@/lib/manuscript-fields';
import { checkManuscriptLanguage, type LanguageCheck } from '@/lib/manuscript-language';
import { manuscriptSubmissionSchema } from '@/lib/submission-validation';
import type { ManuscriptMetadata } from '@/lib/manuscript-metadata';
import type { Language } from '@/types/journal';
import { submissionTranslator } from '@/lib/submission-copy';

type Coauthor = { id: string; full_name: string; email: string; affiliation: string; country: string };
const limits: Record<ManuscriptField, number> = { title: 500, abstract: 10000, keywords: 1000, author_name: 150, email: 254, affiliation: 500, country: 100 };

export function SubmissionForm({ lang, orcidEnabled = false, orcidFailed = false, orcidIdentity }: { lang: Language; orcidEnabled?: boolean; orcidFailed?: boolean; orcidIdentity?: { id: string; name: string; environment: string } }) {
  const t = submissionTranslator(lang);
  const labels: Record<ManuscriptField, string> = { title: t("Article title"), abstract: t("Abstract"), keywords: t("Keywords"), author_name: t("Full name"), email: t("Email address"), affiliation: t("Affiliation"), country: t("Country") };
  const invalidFile = t("Choose a PDF or DOCX file no larger than 4 MB.");
  const orcidStartUrl = `/api/orcid/start?lang=${lang}`;
  const [fields, setFields] = useState<TrackedFields>({ values: { ...emptyManuscriptFields }, automatic: {}, edited: {} });
  const [file, setFile] = useState<File | null>(null);
  const [coauthors, setCoauthors] = useState<Coauthor[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [report, setReport] = useState<{ found: ManuscriptField[]; missing: ManuscriptField[] } | null>(null);
  const [documentLanguage, setDocumentLanguage] = useState<LanguageCheck | null>(null);
  const [extractionNote, setExtractionNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [receiptQueued, setReceiptQueued] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [original, setOriginal] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const extractionId = useRef(0);
  const sending = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const values = fields.values;
  const metadataLanguage = checkManuscriptLanguage(`${values.title}\n${values.abstract}\n${values.keywords}`);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (reviewing) reviewHeading.current?.focus(); }, [reviewing]);

  function edit(field: ManuscriptField, value: string) {
    setFields(current => editManuscriptField(current, field, value));
    setConfirmed(false);
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    controller.current?.abort();
    const id = ++extractionId.current;
    setFile(nextFile); setFields(clearAutomaticFields); setReport(null); setDocumentLanguage(null);
    setExtractionNote(''); setExtracting(false); setError(''); setConfirmed(false);
    if (!nextFile) return;
    if (!/\.(pdf|docx)$/i.test(nextFile.name) || !nextFile.size || nextFile.size > MAX_UPLOAD_BYTES) { setError(invalidFile); return; }
    if (/\.pdf$/i.test(nextFile.name)) { setExtractionNote(t("PDF metadata must be entered manually. The editorial office will check the manuscript language.")); return; }
    setExtracting(true);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 30000);
    try {
      const body = new FormData(); body.set('file', nextFile);
      const response = await fetch('/api/submissions/metadata', { method: 'POST', body, signal: abort.signal });
      const result = await response.json().catch(() => { throw new Error('Word metadata could not be read.'); });
      if (!response.ok || !result.success) throw new Error(result.error || t("Word metadata could not be read."));
      if (id !== extractionId.current) return;
      setFields(current => applyManuscriptSuggestions(current, result.metadata as ManuscriptMetadata));
      setReport(result.report); setDocumentLanguage(result.language);
      setExtractionNote(result.report.found.length ? t("Review the detected values below. Your manual edits have been preserved.") : t("No supported metadata headings were found. Use the Word template or complete the fields manually."));
    } catch (cause) {
      if (id === extractionId.current) setExtractionNote(`${cause instanceof Error && cause.name !== 'AbortError' ? t(cause.message, 'Word metadata could not be read.') : t("Reading the Word file timed out.")} ${t('Complete the fields manually or select another file.')}`);
    } finally { clearTimeout(timeout); if (id === extractionId.current) setExtracting(false); }
  }

  function validate() {
    if (!file || !/\.(pdf|docx)$/i.test(file.name) || !file.size || file.size > MAX_UPLOAD_BYTES) { setError(invalidFile); return false; }
    const result = manuscriptSubmissionSchema.safeParse({ ...values, coauthors, lang: 'en', consent: String(consent), original: String(original), reviewed: 'true' });
    if (!result.success) {
      const fieldsWithErrors = [...new Set(result.error.issues.map(issue => String(issue.path[0] || 'submission')))];
      const reason = result.error.issues.some(issue => issue.message === 'Replace the template examples with your manuscript details.')
        ? 'Replace the template examples with your manuscript details.' : 'Please check the required fields:';
      setError(`${t(reason)} ${fieldsWithErrors.map(field => labels[field as ManuscriptField] || t(field)).join(', ')}.`);
      return false;
    }
    if (metadataLanguage.status === 'non_english' || documentLanguage?.status === 'non_english') { setError(t("Only English manuscripts are accepted. Correct the metadata or select an English manuscript.")); return false; }
    return true;
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!extracting && validate()) { setReviewing(true); setConfirmed(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || sending.current || !validate() || !file) return;
    sending.current = true; setPending(true); setError('');
    try {
      const body = new FormData();
      for (const field of manuscriptFieldNames) body.set(field, values[field]);
      body.set('coauthors', JSON.stringify(coauthors.map(({ full_name, email, affiliation, country }) => ({ full_name, email, affiliation, country }))));
      body.set('lang', 'en'); body.set('consent', 'true'); body.set('original', 'true'); body.set('reviewed', 'true'); body.set('file', file);
      const response = await fetch('/api/submissions', { method: 'POST', body });
      const result = await response.json().catch(() => { throw new Error('Submission failed. Please try again.'); });
      if (!response.ok || !result.success) throw new Error(result.error || t("Submission failed. Please try again."));
      setTrackingLink(typeof result.tracking_url === 'string' && result.tracking_url.startsWith('/track/') ? result.tracking_url : '');
      setReceiptQueued(result.receipt_queued !== false);
      setReference(result.reference);
    } catch (cause) { setError(cause instanceof Error ? t(cause.message, 'Submission failed. Please try again.') : t("Submission failed. Please try again.")); }
    finally { sending.current = false; setPending(false); }
  }

  function input(field: ManuscriptField) {
    return <label key={field}>{labels[field]} *{field === 'abstract'
      ? <textarea name={field} required minLength={50} maxLength={limits[field]} rows={6} value={values[field]} onChange={event => edit(field, event.target.value)} />
      : <input name={field} required type={field === 'email' ? 'email' : 'text'} minLength={field === 'title' ? 5 : field === 'email' ? undefined : 2} maxLength={limits[field]} value={values[field]} onChange={event => edit(field, event.target.value)} />}
      {fields.automatic[field] !== undefined && <small>{t("Filled from the selected Word file. Please verify.")}</small>}
    </label>;
  }

  return <div className="policy-page" lang={lang}>
    <div className="policy-banner"><div className="policy-width"><p className="policy-kicker">{t("AGM JOURNAL / AUTHORS")}</p><h1>{t("Submit a manuscript")}</h1><p>{t("Only English manuscripts are accepted. Receipt does not constitute acceptance for publication.")}</p></div></div>
    <div className="submission-wrap">
      {reference ? <div className="submission-success" role="status"><CheckCircle2 size={32} /><h2>{t("Manuscript received")}</h2><p>{t("Submission reference")}</p><strong>{reference}</strong><p>{t("Keep this reference. The editorial office will contact the corresponding author at the email address provided.")}</p>
        {trackingLink && <><Link href={trackingLink} className="policy-button" prefetch={false}>{t('Track your manuscript')}</Link><p>{t('Save this private tracking link. Email delivery is processed separately.')}</p></>}
        {!receiptQueued && <p>{t('The receipt email could not be queued. Keep your submission reference and tracking link.')}</p>}
      </div> : <>
        {!reviewing && <section className="submission-note" aria-label="ORCID">
          {orcidFailed && <p role="alert">{t("ORCID authentication failed. Try again or submit without ORCID.")}</p>}
              {orcidIdentity ? <p>{orcidIdentity.environment === 'sandbox' ? t("ORCID sandbox test; not saved as a real researcher profile") : t("Authenticated with ORCID")}: {orcidIdentity.id} {orcidIdentity.name}</p> : orcidEnabled ? <><a href={orcidStartUrl}>{t("Connect with ORCID")}</a><p>{t("Connect ORCID before completing the form.")}</p></> : <p>{t("ORCID authentication is not configured yet.")}</p>}
        </section>}
        <form onSubmit={review} className="submission-form" hidden={reviewing}>
          <p className="submission-note">{t("Prepare your manuscript in English.")}{' '}<Link href={`/${lang}/guidelines`}>{t("Author guidelines")}</Link> | <a href="/api/submissions/template" download>{t("Download the English Word template")}</a></p>
          <fieldset disabled={pending}><legend>{t("1. Manuscript file")}</legend>
            <label className="submission-upload"><span><Upload size={18} />{t("Upload PDF or Word *")}</span><input required type="file" name="file" accept=".pdf,.docx" onChange={selectFile} /><small>{t("PDF or DOCX, up to 4 MB. Include all authors and affiliations. Word headings: Title, Abstract, Keywords, Corresponding author, Email, Affiliation, Country.")}</small>{file && <p>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}</label>
            <div aria-live="polite">{extracting ? <p>{t("Reading the Word file...")}</p> : <>
              {extractionNote && <p>{extractionNote}</p>}
              {report && <><p>{t("Detected:")}{' '}{report.found.map(field => labels[field]).join(', ') || t("none")}.</p><p>{t("Not detected:")}{' '}{report.missing.map(field => labels[field]).join(', ') || t("none")}{t(". Complete any empty fields.")}</p></>}
              {documentLanguage && <p>{t(documentLanguage.message)}</p>}
            </>}</div>
          </fieldset>
          <fieldset><legend>{t("2. Corresponding author")}</legend><div className="submission-grid">{(['author_name', 'email', 'affiliation', 'country'] as const).map(input)}</div></fieldset>
          <fieldset><legend>{t("3. Coauthors")}</legend><p>{t("Enter every additional author in publication order. The corresponding author is listed first.")}</p>
            {coauthors.map((author, index) => <fieldset key={author.id}><legend>{t("Coauthor")}{' '}{index + 1}</legend><div className="submission-grid">
              {(['full_name', 'email', 'affiliation', 'country'] as const).map(field => <label key={field}>{field === 'full_name' ? t("Full name") : field === 'email' ? t("Email (optional)") : field === 'affiliation' ? t("Affiliation") : t("Country")}{field !== 'email' && ' *'}<input type={field === 'email' ? 'email' : 'text'} required={field !== 'email'} minLength={field === 'email' ? undefined : 2} maxLength={field === 'affiliation' ? 500 : field === 'email' ? 254 : field === 'country' ? 100 : 150} value={author[field]} onChange={event => setCoauthors(current => current.map(item => item.id === author.id ? { ...item, [field]: event.target.value } : item))} /></label>)}
            </div><button type="button" onClick={() => setCoauthors(current => current.filter(item => item.id !== author.id))}>{t("Remove coauthor")}{' '}{index + 1}</button></fieldset>)}
            <button type="button" disabled={coauthors.length >= 30} onClick={() => setCoauthors(current => [...current, { id: crypto.randomUUID(), full_name: '', email: '', affiliation: '', country: '' }])}>{t("Add coauthor")}</button>
          </fieldset>
          <fieldset><legend>{t("4. Manuscript details (English)")}</legend>{(['title', 'abstract', 'keywords'] as const).map(input)}<small>{t("Separate keywords with commas or semicolons.")}</small>{values.abstract && <p role="status">{t(metadataLanguage.message)}</p>}</fieldset>
          <fieldset className="submission-declarations"><legend>{t("5. Declarations")}</legend>
            <label><input type="checkbox" required checked={original} onChange={event => setOriginal(event.target.checked)} /><span>{t("I confirm that this work is original, all authors agree to this submission, and it is not simultaneously submitted to another journal.")}</span></label>
            <label><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t("I have read the")}{' '}<Link href={`/${lang}/privacy`}>{t("privacy policy")}</Link> {' '}{t("and consent to the editorial office processing this submission for review.")}</span></label>
          </fieldset>
          {!reviewing && error && <p className="submission-error" role="alert">{error}</p>}
          <button type="submit" className="policy-button" disabled={extracting || pending}>{t("Review submission")}</button>
        </form>
        {reviewing && <form onSubmit={submit} className="submission-form submission-review">
          <h2 ref={reviewHeading} tabIndex={-1}>{t("Review your submission")}</h2><p>{t("Check the selected file, all authors and the English metadata before sending.")}</p>
          <dl><dt>{t("Manuscript file")}</dt><dd>{file?.name}</dd><dt>{t("Language")}</dt><dd>{t("English")}</dd>{(['title', 'abstract', 'keywords'] as const).map(field => <div key={field}><dt>{labels[field]}</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{values[field]}</dd></div>)}</dl>
          <h3>{t("Authors in publication order")}</h3><ol><li>{values.author_name} {' '}{t("(corresponding author) -")}{' '}{values.affiliation}, {values.country}; {values.email}</li>{coauthors.map(author => <li key={author.id}>{author.full_name} - {author.affiliation}, {author.country}{author.email && `; ${author.email}`}</li>)}</ol>
          <p>{t(documentLanguage?.message || 'The document language requires editorial verification.')}</p><p>{t(metadataLanguage.message)}</p>
          <fieldset className="submission-declarations" disabled={pending}><label><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>{t("I reviewed the file and all author details. I confirm that the manuscript, title, abstract and keywords are in English.")}</span></label></fieldset>
          {error && <p className="submission-error" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-4"><button type="button" className="policy-button" disabled={pending} onClick={() => { setReviewing(false); setConfirmed(false); setError(''); }}>{t("Back to editing")}</button><button type="submit" className="policy-button" disabled={pending || !confirmed}><Send size={16} />{pending ? t("Submitting...") : t("Send manuscript")}</button></div>
        </form>}
      </>}
    </div>
  </div>;
}
