import { publicPageMetadata } from '@/lib/page-metadata';
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
  const roles = {
    uz: { editor_in_chief: 'Bosh muharrir', deputy_editor: 'Bosh muharrir o‘rinbosari', editorial_board_member: 'Tahririyat hay’ati a’zosi', scientific_secretary: 'Ilmiy kotib', managing_editor: 'Mas’ul kotib' },
    en: { editor_in_chief: 'Editor in chief', deputy_editor: 'Deputy editor', editorial_board_member: 'Editorial board member', scientific_secretary: 'Scientific secretary', managing_editor: 'Managing editor' },
    ru: { editor_in_chief: 'Главный редактор', deputy_editor: 'Заместитель главного редактора', editorial_board_member: 'Член редакционной коллегии', scientific_secretary: 'Учёный секретарь', managing_editor: 'Ответственный секретарь' },
  };
  const countries: Record<string, { en: string; ru: string }> = {
    'O‘zbekiston': { en: 'Uzbekistan', ru: 'Узбекистан' },
    'Germaniya': { en: 'Germany', ru: 'Германия' },
    'Rossiya': { en: 'Russia', ru: 'Россия' },
  };

  return (
    <div className="journal-container interior-page editorial-board-page py-10 space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-gold-700" />
          <span>{dict.nav.editorial}</span>
        </h1>
        <p className="text-sm text-slate-500">
          {currentLang === 'en' ? 'The editorial board and scientific advisors of AGM Journal.' : currentLang === 'ru' ? 'Редакционная коллегия и научные консультанты AGM Journal.' : 'AGM Journal tahririyat hay’ati va ilmiy maslahatchilari.'}
        </p>
      </div>

      <div className="space-y-6">
        {members.length === 0 && <div className="interior-empty"><p>{dict.common.noResults}</p></div>}
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-xl academic-border academic-shadow p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-teal-700 transition-all"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-200">
                  {roles[currentLang][member.role]}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {currentLang === 'uz' ? member.country : countries[member.country]?.[currentLang] || member.country}
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

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const language = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const titles = { uz: 'Tahririyat hay’ati', en: 'Editorial board', ru: 'Редакционная коллегия' };
  const descriptions = {
    uz: 'AGM Journal xalqaro ilmiy jurnalining tahririyat hay’ati a’zolari va ilmiy maslahatchilari bilan tanishing.',
    en: 'Meet the editors and researchers responsible for the editorial work of AGM Journal.',
    ru: 'Познакомьтесь с членами редакционной коллегии и научными консультантами международного журнала AGM Journal.',
  };
  return publicPageMetadata(language, '/editorial-board', titles[language], descriptions[language]);
}
