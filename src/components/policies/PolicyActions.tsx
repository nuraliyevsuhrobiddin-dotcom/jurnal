'use client';

import { Download, Printer } from 'lucide-react';
import type { Language } from '@/types/journal';
import { policyLabels } from './labels';

export function PolicyActions({ id, lang }: { id: string; lang: Language }) {
 const t = policyLabels[lang];
 return <div className="policy-actions"><a className="policy-button" href={`/api/policies/${id}/pdf?lang=${lang}`}><Download size={16} />{t.download}</a><button className="policy-button policy-button-secondary" type="button" onClick={() => window.print()}><Printer size={16} />{t.print}</button></div>;
}
