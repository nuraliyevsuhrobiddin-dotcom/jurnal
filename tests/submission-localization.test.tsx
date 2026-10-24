import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubmissionForm } from '@/components/SubmissionForm';
import { submissionMessages, submissionTranslator } from '@/lib/submission-copy';
import type { Language } from '@/types/journal';

describe('Submission interface languages', () => {
  it.each<[Language, string, string]>([
    ['uz', 'Maqola yuborish', 'Maqola nomi'],
    ['ru', 'Отправить рукопись', 'Название статьи'],
    ['en', 'Submit a manuscript', 'Article title'],
  ])('renders the %s interface while preserving the English manuscript requirement', (lang, heading, title) => {
    const html = renderToStaticMarkup(<SubmissionForm lang={lang} orcidEnabled />);
    expect(html).toContain(`<h1>${heading}</h1>`);
    expect(html).toContain(`${title} *`);
    expect(html).toContain(`lang="${lang}"`);
    expect(html).toContain(`/api/orcid/start?lang=${lang}`);
    expect(html).toContain(`href="/${lang}/guidelines"`);
    expect(html).toContain(`href="/${lang}/privacy"`);
    expect(html).toContain(submissionTranslator(lang)('Only English manuscripts are accepted. Receipt does not constitute acceptance for publication.'));
    if (lang !== 'en') {
      expect(html).not.toContain('>Send manuscript<');
      expect(html).not.toContain('>Review submission<');
      expect(html).not.toContain('href="/en/guidelines"');
    }
  });

  it('translates API failures and hides unknown transport errors behind a localized fallback', () => {
    expect(submissionTranslator('uz')('File exceeds 4 MB limit')).toBe('Fayl 4 MB chegarasidan oshgan.');
    expect(submissionTranslator('ru')('Failed to fetch', 'Submission failed. Please try again.')).toBe('Не удалось отправить рукопись. Повторите попытку.');
    expect(new Set(submissionMessages.map(message => message[0])).size).toBe(submissionMessages.length);
  });
});
