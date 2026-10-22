import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Language } from '@/types/journal';

const copy = {
  uz: {
    eyebrow: 'Ilmiy infratuzilma',
    title: 'Ilmiy qidiruv va identifikatorlar',
    details: 'Batafsil',
    descriptions: ['Ilmiy metama’lumotlar', 'DOI havolalari', 'Tadqiqotlar repozitoriysi', 'Tadqiqotchi profillari'],
  },
  en: {
    eyebrow: 'Research infrastructure',
    title: 'Discovery & identifiers',
    details: 'Explore services',
    descriptions: ['Scholarly metadata', 'DOI links', 'Research repository', 'Researcher profiles'],
  },
  ru: {
    eyebrow: 'Научная инфраструктура',
    title: 'Поиск и идентификаторы',
    details: 'Подробнее',
    descriptions: ['Научные метаданные', 'Ссылки DOI', 'Репозиторий исследований', 'Профили исследователей'],
  },
};

const providers = [
  { id: 'google-scholar', name: 'Google Scholar', logo: '/brands/google-scholar.svg', width: 190, height: 44 },
  { id: 'crossref', name: 'Crossref', logo: '/brands/crossref.svg', width: 200, height: 68 },
  { id: 'zenodo', name: 'Zenodo', logo: '/brands/zenodo.png', width: 200, height: 80 },
  { id: 'orcid', name: 'ORCID', logo: '/brands/orcid.png', width: 128, height: 128 },
];

export function IntegrationLogos({ lang }: { lang: Language }) {
  const text = copy[lang];
  return (
    <section className="catalog-integrations" aria-labelledby="integrations-title">
      <div className="journal-container">
        <div className="catalog-integrations-heading">
          <div>
            <p className="catalog-eyebrow">{text.eyebrow}</p>
            <h2 id="integrations-title">{text.title}</h2>
          </div>
          <Link className="catalog-text-link" href={`/${lang}/integrations`}>
            {text.details}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="catalog-integrations-grid">
          {providers.map((provider, index) => (
            <Link
              key={provider.id}
              className="catalog-integration-card"
              href={`/${lang}/integrations#${provider.id}`}
              aria-label={`${provider.name}: ${text.descriptions[index]}`}
            >
              <span className="catalog-integration-logo">
                <Image
                  src={provider.logo}
                  alt={provider.name === 'ORCID' ? '' : provider.name}
                  width={provider.width}
                  height={provider.height}
                  unoptimized
                />
                {provider.id === 'orcid' && <span className="catalog-integration-orcid-text">ORCID</span>}
              </span>
              <span className="catalog-integration-meta"><span>{text.descriptions[index]}</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
