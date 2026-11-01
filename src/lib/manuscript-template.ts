import JSZip from 'jszip';
import type { Language, JournalSettings } from '@/types/journal';
import { manuscriptStandard, manuscriptStandardCopy } from './manuscript-standard';
import { siteUrl } from './site-url';

const copy = {
  uz: {
    labels: ['Sarlavha', 'Mas’ul muallif', 'Email', 'Tashkilot', 'Mamlakat', 'ORCID (mavjud bo‘lsa)', 'Hammualliflar va tashkilotlari'],
    abstract: 'Annotatsiya', keywords: 'Kalit so‘zlar', declarations: 'Deklaratsiyalar', references: 'Adabiyotlar', instructions: 'SHABLONDAN FOYDALANISH VA MAQOLA TALABLARI',
    sections: ['Kirish', 'Materiallar va metodlar', 'Natijalar', 'Muhokama', 'Xulosa'],
    statements: ['Mualliflar hissasi', 'Moliyalashtirish', 'Manfaatlar to‘qnashuvi', 'Ma’lumotlar va kod mavjudligi', 'Etika tasdig‘i va ishtirokchilar roziligi', 'Generativ sun’iy intellektdan foydalanish'],
    coverTitle: 'Maqola qo‘lyozmasi',
    coverSubtitle: 'Mualliflar uchun rasmiy shablon',
    submissionEmail: 'Tahririyat bilan aloqa:',
    guidelinesUrl: 'Rasmiy yo‘riqnoma:',
    notes: [
      'Barcha {{...}} joylarini haqiqiy ma’lumotlar bilan almashtiring. Tegishli bo‘lmagan deklaratsiyada “Qo‘llanmaydi” deb yozib, sababini qisqa izohlang. Ushbu yo‘riqnoma sahifasini yuborishdan oldin olib tashlang.',
      'Kirishda muammo, mavzuning dolzarbligi, oldingi tadqiqotlar, mavjud ilmiy bo‘shliq va tadqiqotning aniq maqsadi bayon etiladi.',
      'Materiallar va metodlar bo‘limida tadqiqot dizayni, tanlanma, manbalar, o‘lchovlar va statistik tahlil usullari boshqa olimlar takrorlay oladigan darajada batafsil tushuntirilishi zarur.',
      'Natijalar dalillar bilan ko‘rsatiladi; jadvallar va rasmlar ketma-ket raqamlanadi (1-jadval, 1-rasm), har biriga sarlavha va o‘lchov birliklari yoziladi.',
      'Muhokama bo‘limida olingan natijalar oldingi ilmiy ishlar bilan qiyoslanadi, ilmiy yangilik, amaliy ahamiyat va cheklovlar tahlil qilinadi. Xulosa bo‘limiga esa yangi natijalar kiritilmaydi.',
      'Annotatsiya maqsad, usul, asosiy natijalar va ilmiy ahamiyatni 150–250 so‘zda mustaqil tushunarli bayon qiladi. Kalit so‘zlar (5–8 ta) mavzu va usullarni aniq ifodalaydi.',
      'Sharh, nazariy ish va holat tavsifida (case study) asosiy bo‘limlar tadqiqot yo‘nalishiga mos ravishda moslashtirilishi mumkin.',
      'Havolalar va adabiyotlar: bir tan olingan havola uslubini (masalan, APA yoki IEEE) izchil qo‘llang. Har bir adabiyotda mualliflar, yil, maqola sarlavhasi, nashr nomi, jild, son, sahifalar va mavjud bo‘lsa DOI ko‘rsatilishi kerak.',
      'Barcha mualliflar maqolani yuborishga roziligini va ish boshqa jurnalga taqdim etilmaganini tasdiqlaydi. Mualliflar tartibi va tashkilot nomlari onlayn shaklda ham bir xil kiritilishi shart.',
      'Maqola DOCX yoki ushbu shablondan eksport qilingan PDF formatida (hajmi 4 MB gacha) qabul qilinadi. Barcha maqolalar ikki tomonlama anonim taqriz (double-blind peer review) asosida ko‘rib chiqiladi.',
    ],
  },
  en: {
    labels: ['Title', 'Corresponding author', 'Email', 'Affiliation', 'Country', 'ORCID (if available)', 'Coauthors and affiliations'],
    abstract: 'Abstract', keywords: 'Keywords', declarations: 'Declarations', references: 'References', instructions: 'USING THIS TEMPLATE & MANUSCRIPT GUIDELINES',
    sections: ['Introduction', 'Materials and methods', 'Results', 'Discussion', 'Conclusion'],
    statements: ['Author contributions', 'Funding', 'Competing interests', 'Data and code availability', 'Ethics approval and consent', 'Generative AI use'],
    coverTitle: 'Manuscript Submission',
    coverSubtitle: 'Official Author Template',
    submissionEmail: 'Editorial office contact:',
    guidelinesUrl: 'Official author guidelines:',
    notes: [
      'Replace all {{...}} fields with actual manuscript information. For inapplicable declarations, state “Not applicable” with a brief reason. Delete this instruction page before submission.',
      'The Introduction must define the scientific problem, contemporary relevance, prior literature, the knowledge gap, and the specific research objective.',
      'The Materials and Methods section must describe study design, participants/samples, data sources, measurement procedures, and statistical methods in reproducible detail.',
      'Results should be presented clearly with empirical evidence. Number all tables and figures consecutively (Table 1, Figure 1), accompanied by descriptive captions and units of measurement.',
      'The Discussion interprets findings in context of prior scholarship, articulating scientific contribution, practical implications, and limitations. Do not introduce new findings in the Conclusion.',
      'The Abstract (150–250 words) should stand alone, summarizing objectives, methodology, primary findings, and research significance. Keywords (5–8) should represent core themes.',
      'Adapt body section structures as appropriate for systematic reviews, theoretical work, and case studies.',
      'Use one recognized reference citation standard (e.g., APA or IEEE) consistently. Include authors, publication year, article title, journal name, volume, issue, page ranges, and DOI where available.',
      'All authors must agree to submission and verify that the manuscript has not been submitted elsewhere concurrently. Author names and affiliations must match between the manuscript and the online submission system.',
      'Submit DOCX or a PDF exported from this template, up to 4 MB. All manuscripts undergo rigorous double-blind peer review assessing originality, methodology, and scientific rigor.',
    ],
  },
  ru: {
    labels: ['Название', 'Контактный автор', 'Email', 'Организация', 'Страна', 'ORCID (при наличии)', 'Соавторы и организации'],
    abstract: 'Аннотация', keywords: 'Ключевые слова', declarations: 'Декларации', references: 'Литература', instructions: 'РУКОВОДСТВО ПО ИСПОЛЬЗОВАНИЮ ШАБЛОНА',
    sections: ['Введение', 'Материалы и методы', 'Результаты', 'Обсуждение', 'Заключение'],
    statements: ['Вклад авторов', 'Финансирование', 'Конфликт интересов', 'Доступность данных и кода', 'Этическое одобрение и согласие', 'Использование генеративного ИИ'],
    coverTitle: 'Рукопись для подачи',
    coverSubtitle: 'Официальный шаблон для авторов',
    submissionEmail: 'Связь с редакцией:',
    guidelinesUrl: 'Официальные правила для авторов:',
    notes: [
      'Замените все поля {{...}} фактическими данными рукописи. Для неприменимых деклараций укажите «Не применимо» с кратким обоснованием. Удалите эту страницу инструкций перед отправкой.',
      'Во введении раскройте актуальность темы, обзор предшествующих исследований, научную проблему и конкретную цель работы.',
      'В разделе «Материалы и методы» подробно опишите дизайн исследования, выборку, источники данных, методики измерений и методы статистического анализа для обеспечения воспроизводимости.',
      'Результаты излагаются с доказательной базой; таблицы и рисунки нумеруются последовательно (Таблица 1, Рисунок 1) с поясняющими названиями и единицами измерения.',
      'В обсуждении сопоставьте результаты с ранее опубликованными трудами, обоснуйте научную новизну, практическую ценность и ограничения работы. В заключение новые результаты не вводятся.',
      'Аннотация (150–250 слов) должна емко отражать цель, методы, основные выводы и научную значимость. Ключевые слова (5–8) должны точно описывать предметную область.',
      'Структура разделов может быть адаптирована для аналитических обзоров, теоретических статей и описаний клинических случаев.',
      'Единообразно применяйте один признанный стиль цитирования (ГОСТ, APA или IEEE). Указывайте авторов, год, название статьи, издание, том, номер, страницы и DOI при наличии.',
      'Все соавторы подтверждают согласие на подачу и гарантируют, что рукопись не рассматривается в других изданиях. Порядок авторов и места работы в файле должны совпадать с онлайн-формой.',
      'Рукопись принимается в формате DOCX или PDF, экспортированном из данного шаблона (до 4 МБ). Все статьи проходят двустороннее анонимное (слепое) рецензирование.',
    ],
  },
} as const;

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;

function p(text: string, style = 'Normal'): string {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export async function generateManuscriptTemplate(lang: Language, settings?: JournalSettings) {
  const c = copy[lang], s = manuscriptStandard;
  const journalName = settings?.journal_name || 'AGM Journal';
  const publisherName = settings?.publisher || 'AGM Journal Publishing';
  const contactEmail = settings?.contact_email || 'agmjoural.editorial@gmail.com';
  const websiteUrl = siteUrl(`/${lang}/guidelines`);
  const zip = new JSZip();
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const relationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  const metadata = ['TITLE', 'AUTHOR', 'EMAIL', 'AFFILIATION', 'COUNTRY', 'ORCID', 'COAUTHORS'];
  const sections = ['INTRODUCTION', 'METHODS', 'RESULTS', 'DISCUSSION', 'CONCLUSION'];
  const declarations = ['AUTHOR_CONTRIBUTIONS', 'FUNDING', 'COMPETING_INTERESTS', 'DATA_AVAILABILITY', 'ETHICS_AND_CONSENT', 'AI_DISCLOSURE'];

  const body = [
    ...c.labels.map((label, i) => p(`${label}: {{${metadata[i]}}}`, i ? 'Author' : 'Title')),
    p(c.abstract, 'Heading1'), p('{{ABSTRACT}}', 'Abstract'), p(`${c.keywords}: {{KEYWORDS}}`, 'Abstract'),
    ...c.sections.flatMap((heading, i) => [p(`${i + 1}. ${heading}`, 'Heading1'), p(`{{${sections[i]}}}`)]),
    p(c.declarations, 'Heading1'), ...c.statements.map((label, i) => p(`${label}: {{${declarations[i]}}}`, 'Declaration')),
    p(c.references, 'Heading1'), p('{{REFERENCES}}', 'Reference'),
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    p(c.instructions, 'Heading1'),
    p(`${journalName} · ${s.version} · ${s.date}`, 'Note'),
    p(manuscriptStandardCopy[lang].summary, 'Note'),
    p(manuscriptStandardCopy[lang].language, 'Note'),
    ...c.notes.map(note => p(`• ${note}`, 'Note')),
    p(`${c.submissionEmail} ${contactEmail}`, 'Note'),
    p(`${c.guidelinesUrl} ${websiteUrl}`, 'Note'),
  ].join('');

  const margin = Math.round(s.marginMm / 25.4 * 1440);
  const indent = Math.round(s.firstLineMm / 25.4 * 1440);

  const styles = [
    ['Normal', `<w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/><w:ind w:firstLine="${indent}"/><w:jc w:val="both"/><w:widowControl/></w:pPr>`],
    ['Title', '<w:pPr><w:keepNext/><w:spacing w:before="120" w:after="180"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="102B3F"/></w:rPr>'],
    ['Author', '<w:pPr><w:keepNext/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:spacing w:line="276" w:lineRule="auto"/><w:spacing w:after="40"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr>'],
    ['Heading1', '<w:pPr><w:keepNext/><w:keepLines/><w:outlineLvl w:val="0"/><w:ind w:firstLine="0"/><w:spacing w:before="180" w:after="80"/></w:pPr><w:rPr><w:b/><w:color w:val="0D6163"/></w:rPr>'],
    ['Abstract', '<w:pPr><w:ind w:firstLine="0"/><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr>'],
    ['Declaration', '<w:pPr><w:ind w:firstLine="0"/><w:spacing w:after="80"/></w:pPr>'],
    ['Reference', '<w:pPr><w:ind w:left="567" w:hanging="567"/><w:spacing w:after="100"/></w:pPr>'],
    ['Note', '<w:pPr><w:ind w:firstLine="0"/><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="475569"/></w:rPr>'],
  ];

  const wordLang = { uz: 'uz-Latn-UZ', ru: 'ru-RU', en: 'en-GB' }[lang];

  zip.file('[Content_Types].xml', xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[['document', 'document.main'], ['styles', 'styles'], ['header1', 'header'], ['footer1', 'footer']].map(([part, type]) => `<Override PartName="/word/${part}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`));
  zip.file('_rels/.rels', xml(`<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`));
  zip.file('word/_rels/document.xml.rels', xml(`<Relationships xmlns="${relationships}">${[['styles', 'styles'], ['header', 'header1'], ['footer', 'footer1']].map(([type, target]) => `<Relationship Id="rId${type}" Type="${office}/${type}" Target="${target}.xml"/>`).join('')}</Relationships>`));
  zip.file('word/document.xml', xml(`<w:document xmlns:w="${ns}" xmlns:r="${office}"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdheader"/><w:footerReference w:type="default" r:id="rIdfooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="567" w:footer="567"/><w:pgNumType w:start="1"/></w:sectPr></w:body></w:document>`));
  zip.file('word/styles.xml', xml(`<w:styles xmlns:w="${ns}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${s.font}" w:hAnsi="${s.font}" w:cs="${s.font}" w:eastAsia="${s.font}"/><w:sz w:val="${s.fontSize * 2}"/><w:szCs w:val="${s.fontSize * 2}"/><w:lang w:val="${wordLang}"/></w:rPr></w:rPrDefault></w:docDefaults>${styles.map(([id, properties]) => `<w:style w:type="paragraph" w:styleId="${id}"${id === 'Normal' ? ' w:default="1"' : ''}><w:name w:val="${id}"/>${id !== 'Normal' ? '<w:basedOn w:val="Normal"/>' : ''}${properties}</w:style>`).join('')}</w:styles>`));

  // Professional Header: Journal name, running separator line
  const headerText = `${journalName.toUpperCase()}  ·  ${c.coverTitle.toUpperCase()}`;
  zip.file('word/header1.xml', xml(`<w:hdr xmlns:w="${ns}"><w:p><w:pPr><w:jc w:val="both"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="0D6163"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="102B3F"/></w:rPr><w:t xml:space="preserve">${escapeXml(headerText)}</w:t></w:r></w:p></w:hdr>`));

  // Professional Footer: Website | Page number with clean top line
  zip.file('word/footer1.xml', xml(`<w:ftr xmlns:w="${ns}"><w:p><w:pPr><w:jc w:val="center"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="CBD5E1"/></w:pBdr></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">${escapeXml(journalName)}  ·  ${escapeXml(websiteUrl)}   |   </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`));

  // Core Properties (Metadata seen in Word Properties & Explorer)
  zip.file('docProps/core.xml', xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${escapeXml(journalName)} — ${escapeXml(c.coverTitle)}</dc:title><dc:creator>${escapeXml(journalName)} Tahririyati</dc:creator><dc:subject>${escapeXml(c.coverSubtitle)}</dc:subject><dc:description>${escapeXml(websiteUrl)}</dc:description><dc:publisher>${escapeXml(publisherName)}</dc:publisher><dc:language>${lang}</dc:language><cp:version>${s.version}</cp:version><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${s.date}</dcterms:created></cp:coreProperties>`));

  // Extended Properties
  zip.file('docProps/app.xml', xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Template>Normal.dotm</Template><Application>AGM Journal Editorial Office</Application><DocSecurity>0</DocSecurity><Company>${escapeXml(publisherName)}</Company></Properties>`));

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
