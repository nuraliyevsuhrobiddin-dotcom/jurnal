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
    <div className="public-site min-h-screen flex flex-col bg-paper text-slate-900 selection:bg-gold-100 selection:text-gold-900">
      <Suspense fallback={<header className="bg-navy-900 h-20 shadow-md" />}>
        <Navbar lang={currentLang} settings={settings} />
      </Suspense>
      <a href="#main-content" className="skip-link">Asosiy kontentga o&apos;tish</a>
      <main id="main-content" className="flex-1" lang={currentLang}>
        {children}
      </main>
      <Footer lang={currentLang} settings={settings} />
    </div>
  );
}
