import { configured, crossrefConfig, orcidConfig, zenodoConfig } from './integration-config';
import type { Language } from '@/types/journal';

// Configuration labels expose no credentials and make no provider-health claim.
export function publicIntegrationStatuses(lang: Language) {
  const copy = {
    uz: { metadata: 'Metama’lumot tayyor', missing: 'Ulanmagan', required: 'Hisob va DOI prefiksi kerak', production: 'Production sozlangan', sandbox: 'Sinov rejimi', profile: 'Profil havolalari mavjud' },
    en: { metadata: 'Metadata ready', missing: 'Not connected', required: 'Account and DOI prefix required', production: 'Production configured', sandbox: 'Test environment', profile: 'Profile links supported' },
    ru: { metadata: 'Метаданные готовы', missing: 'Не подключено', required: 'Нужны аккаунт и DOI-префикс', production: 'Настроена рабочая среда', sandbox: 'Тестовая среда', profile: 'Ссылки на профили' },
  }[lang];
  return [copy.metadata,
    configured(crossrefConfig) ? (crossrefConfig().environment === 'production' ? copy.production : copy.sandbox) : copy.required,
    configured(zenodoConfig) ? (zenodoConfig().environment === 'production' ? copy.production : copy.sandbox) : copy.missing,
    configured(orcidConfig) ? (orcidConfig().environment === 'production' ? copy.production : copy.sandbox) : copy.profile,
  ];
}
