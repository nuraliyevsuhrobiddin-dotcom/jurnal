import React from 'react';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getEditorialBoard } from '@/lib/db';
import { Users, Mail, Award } from 'lucide-react';

export default async function EditorialBoardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);

  const members = await getEditorialBoard();

  return (
    <div className="journal-container py-10 space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-gold-700" />
          <span>{dict.nav.editorial}</span>
        </h1>
        <p className="text-sm text-slate-500">
          AGM Journal xalqaro ilmiy tahririyat hay‘ati va ilmiy maslahatchilari tarkibi
        </p>
      </div>

      <div className="space-y-6">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-xl academic-border academic-shadow p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-teal-700 transition-all"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-200">
                  {member.academic_title || member.role.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {member.country}
                </span>
              </div>

              <h2 className="text-xl font-bold text-navy-900">
                {member.full_name}
              </h2>

              <p className="text-sm font-semibold text-slate-700">
                {member.academic_degree}
              </p>

              <p className="text-xs text-slate-600 italic">
                {member.affiliation}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 text-xs shrink-0">
              {member.orcid && (
                <a
                  href={`https://orcid.org/${member.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-teal-700 font-mono hover:underline"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ORCID: {member.orcid}</span>
                </a>
              )}
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-navy-900 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{member.email}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
