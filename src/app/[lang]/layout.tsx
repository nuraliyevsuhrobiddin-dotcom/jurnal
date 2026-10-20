import '@/components/layout/scholar.css';
import '@/components/layout/interior.css';
import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Language } from '@/types/journal';
import { Navbar } from '@/components/layout/Navbar';
import { getJournalSettings } from '@/lib/db';
import { Footer } from '@/components/layout/Footer';

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!['uz', 'en', 'ru'].includes(lang)) notFound();
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;

  const settings = await getJournalSettings();

  return (
    <div className="public-site min-h-screen flex flex-col bg-paper text-slate-900 selection:bg-teal-100 selection:text-navy-900">
      <a href="#main-content" className="skip-link">{currentLang === 'en' ? 'Skip to content' : currentLang === 'ru' ? 'Перейти к содержанию' : 'Asosiy kontentga o‘tish'}</a>
      <Suspense fallback={<header className="bg-white h-20 border-b border-slate-200" />}>
        <Navbar lang={currentLang} settings={settings} />
      </Suspense>
      <main id="main-content" className="flex-1" lang={currentLang}>
        {children}
      </main>
      <Footer lang={currentLang} settings={settings} />
    </div>
  );
}
