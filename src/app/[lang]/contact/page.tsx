import React from 'react';
import { ContactForm } from '@/components/ContactForm';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getJournalSettings } from '@/lib/db';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);
  const settings = await getJournalSettings();

  const formattedPhone = settings.contact_phone || '+998 99 777 70 31';
  const cleanPhone = formattedPhone.replace(/[^\d+]/g, '');

  return (
    <div className="journal-container py-12 space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
          {dict.nav.contact}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          {dict.contact.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact info cards */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl academic-border academic-shadow p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-navy-900 font-bold text-sm">
              <MapPin className="w-5 h-5 text-gold-700" />
              <span>{dict.contact.addressTitle}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {settings.address || 'Toshkent shahri, Mirobod tumani, Nukus ko‘chasi 45-uy.'}<br />
              {dict.contact.addressAcademy}
            </p>
          </div>

          <div className="bg-white rounded-2xl academic-border academic-shadow p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-navy-900 font-bold text-sm">
              <Mail className="w-5 h-5 text-gold-700" />
              <span>{dict.contact.emailTitle}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {dict.contact.chiefEditor}: <a href="mailto:editor@agmjoural.uz" className="text-teal-700 hover:underline font-medium">editor@agmjoural.uz</a><br />
              {dict.contact.editorialOffice}: <a href={`mailto:${settings.contact_email || 'editorial@agmjoural.uz'}`} className="text-teal-700 hover:underline font-medium">{settings.contact_email || 'editorial@agmjoural.uz'}</a>
            </p>
          </div>

          <div className="bg-white rounded-2xl academic-border academic-shadow p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-navy-900 font-bold text-sm">
              <Phone className="w-5 h-5 text-gold-700" />
              <span>{dict.contact.phoneTitle}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {dict.contact.trustPhone}: <a href={`tel:${cleanPhone}`} className="text-teal-700 hover:underline font-medium">{formattedPhone}</a><br />
              {dict.contact.telegram}: <a href="https://t.me/agmjurnal" target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline font-medium">@agmjurnal</a>
            </p>
          </div>
        </div>

        {/* Quick Message Form */}
        <div className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-700" />
            <span>{dict.contact.formTitle}</span>
          </h2>
          <ContactForm lang={currentLang} />
        </div>
      </div>
    </div>
  );
}
