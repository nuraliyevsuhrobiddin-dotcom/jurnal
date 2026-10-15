import { isValidDoi, normalizeDoi } from './identifiers';

// DOI resolution is read-only; this never mints or registers a DOI.
export async function inspectDoi(value: string) {
  const doi = normalizeDoi(value);
  if (!isValidDoi(doi)) return { doi, status: 'invalid', active: false };
  try {
    const response = await fetch(`https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, '/')}`, {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { Accept: 'text/html', 'User-Agent': 'AGMJournal/1.0 DOI verification' },
    });
    const location = response.headers.get('location');
    await response.body?.cancel();
    return { doi, status: response.status === 404 ? 'not_registered' : response.status >= 300 && response.status < 400 && location ? 'resolving' : 'unknown', active: Boolean(response.status >= 300 && response.status < 400 && location), destination: location || null };
  } catch { return { doi, status: 'unavailable', active: false }; }
}
