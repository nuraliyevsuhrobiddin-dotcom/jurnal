import type { Language } from '@/types/journal';
import { policyLabels } from './labels';

export function PolicySeal({ lang }: { lang: Language }) {
 return <div className="policy-seal" aria-label={`AGM · ${policyLabels[lang].edition}`}><span>AGM</span><strong>JOURNAL</strong><small>{policyLabels[lang].edition}</small></div>;
}
