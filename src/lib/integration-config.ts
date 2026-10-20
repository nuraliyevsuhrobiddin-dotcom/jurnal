export class IntegrationError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value || /placeholder|your[-_]/i.test(value)) throw new IntegrationError(`${name} sozlanmagan.`);
  return value;
}

function mode(name: string, fallback: string, allowed: string[]) {
  const value = process.env[name] || fallback;
  if (!allowed.includes(value)) throw new IntegrationError(`${name} qiymati noto‘g‘ri.`);
  const productionEnabled = process.env.INTEGRATION_PRODUCTION_ENABLED === 'true' ||
    (name === 'ORCID_MODE' && process.env.ORCID_PRODUCTION_ENABLED === 'true');
  if (value === 'production' && !productionEnabled) throw new IntegrationError('Production integratsiya yoqilmagan. Avval test/sandbox rejimini tekshiring.');
  return value;
}

export function crossrefConfig() {
  const environment = mode('CROSSREF_MODE', 'test', ['test', 'production']);
  return { environment, username: required('CROSSREF_USERNAME'), password: required('CROSSREF_PASSWORD'),
    url: environment === 'test' ? 'https://test.crossref.org/servlet/deposit' : 'https://doi.crossref.org/servlet/deposit' };
}

export function zenodoConfig() {
  const environment = mode('ZENODO_MODE', 'sandbox', ['sandbox', 'production']);
  return { environment, token: required('ZENODO_ACCESS_TOKEN'), base: environment === 'sandbox' ? 'https://sandbox.zenodo.org' : 'https://zenodo.org' };
}

export function orcidConfig() {
  const environment = mode('ORCID_MODE', 'sandbox', ['sandbox', 'production']);
  return { environment, clientId: required('ORCID_CLIENT_ID'), clientSecret: required('ORCID_CLIENT_SECRET'),
    secret: process.env.ORCID_COOKIE_SECRET || required('ADMIN_PASSWORD'),
    base: environment === 'sandbox' ? 'https://sandbox.orcid.org' : 'https://orcid.org' };
}

export function configured(check: () => unknown) {
  try { check(); return true; } catch { return false; }
}

export async function providerJson(response: Response) {
  if (!response.ok) throw new IntegrationError(`Xizmat HTTP ${response.status} qaytardi.`, 502);
  try { return await response.json(); } catch { throw new IntegrationError('Xizmat javobi noto‘g‘ri.', 502); }
}
