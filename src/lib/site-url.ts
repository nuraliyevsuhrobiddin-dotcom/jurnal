export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').origin;
export function siteUrl(path = '/') { return new URL(path, SITE_URL).toString(); }
