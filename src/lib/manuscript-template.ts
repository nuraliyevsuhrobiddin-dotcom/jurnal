import JSZip from 'jszip';
import type { Language } from '@/types/journal';
import { manuscriptStandard, manuscriptStandardCopy } from './manuscript-standard';

const copy = {
  uz: {
    labels: ['Sarlavha', 'Mas’ul muallif', 'Email', 'Tashkilot', 'Mamlakat', 'ORCID (mavjud bo‘lsa)', 'Hammualliflar va tashkilotlari'],
    abstract: 'Annotatsiya', keywords: 'Kalit so‘zlar', declarations: 'Deklaratsiyalar', references: 'Adabiyotlar', instructions: 'SHABLONDAN FOYDALANISH',
    sections: ['Kirish', 'Materiallar va metodlar', 'Natijalar', 'Muhokama', 'Xulosa'],
    statements: ['Mualliflar hissasi', 'Moliyalashtirish', 'Manfaatlar to‘qnashuvi', 'Ma’lumotlar va kod mavjudligi', 'Etika tasdig‘i va ishtirokchilar roziligi', 'Generativ sun’iy intellektdan foydalanish'],
    notes: [
      'Barcha {{...}} joylarini haqiqiy ma’lumotlar bilan almashtiring. Tegishli bo‘lmagan deklaratsiyada “Qo‘llanmaydi” deb yozib, sababini tushuntiring. Ushbu yo‘riqnoma sahifasini yuborishdan oldin olib tashlang.',
      'Kirishda muammo, oldingi tadqiqotlar, ilmiy bo‘shliq va aniq maqsadni bayon qiling. Metodlarda dizayn, tanlanma, manbalar, o‘lchovlar va tahlilni baholash va takrorlashga yetarli batafsillikda tushuntiring.',
      'Natijalarni dalillar bilan ko‘rsating; jadval va rasmlarni ketma-ket raqamlang, izoh va o‘lchov birliklarini yozing. Muhokamada oldingi ishlar bilan solishtirish, ilmiy hissa, amaliy ahamiyat va cheklovlarni tushuntiring. Xulosaga yangi natijalar qo‘shmang.',
      'Annotatsiya maqsad, usul, asosiy natija va ahamiyatni mustaqil tushunarli bayon qiladi. Kalit so‘zlar mavzu va usullarni ifodalaydi. Asossiz so‘z, sahifa yoki havola kvotasi qo‘yilmaydi.',
      'Sharh, nazariy ish va holat tavsifida asosiy bo‘limlarni tadqiqot turiga moslang. Asosiy matn tanlangan tilda qoladi. Xalqaro o‘quvchilar uchun nashrdan oldin inglizcha sarlavha va annotatsiyani tahririyat bilan tayyorlang va tekshiring.',
      'Bir tan olingan havola uslubini izchil qo‘llang. Muallif, yil, sarlavha, nashr va mavjud DOI yoki URLni kiriting; har bir havolani asl manbada tekshiring. Faqat mazmunan tegishli manbalarni keltiring.',
      'Hamma mualliflar yuborishga roziligini va ish boshqa jurnalda ko‘rib chiqilmayotganini tasdiqlaydi. Mualliflar tartibi va har bir tashkilotni onlayn formada ham kiriting. Taqriz uchun alohida anonim nusxa tayyorlang va yetkazishni tahririyat bilan kelishing.',
      'DOCX yoki ushbu shablondan eksport qilingan PDF, 4 MB gacha. Tahririyat format va ilmiy mazmunni tekshiradi. Shablonni to‘ldirish nashrga qabulni yoki Scopus’da indekslanishni kafolatlamaydi.',
    ],
  },
  en: {
    labels: ['Title', 'Corresponding author', 'Email', 'Affiliation', 'Country', 'ORCID (if available)', 'Coauthors and affiliations'],
    abstract: 'Abstract', keywords: 'Keywords', declarations: 'Declarations', references: 'References', instructions: 'USING THIS TEMPLATE',
    sections: ['Introduction', 'Materials and methods', 'Results', 'Discussion', 'Conclusion'],
    statements: ['Author contributions', 'Funding', 'Competing interests', 'Data and code availability', 'Ethics approval and consent', 'Generative AI use'],
    notes: [
      'Replace all {{...}} fields with actual information. For an inapplicable declaration write “Not applicable” and explain why. Delete this instruction page before submission.',
      'In the introduction explain the problem, prior research, knowledge gap and specific aim. Describe study design, selection, sources, measurements and analysis in enough detail for assessment and reproducibility.',
      'Report results with evidence. Number tables and figures and include captions and measurement units. Discuss prior work, the scholarly contribution, implications and limitations. Do not introduce new findings in the conclusion.',
      'The abstract should independently explain the aim, methods, principal findings and significance. Keywords describe the topic and methods. No artificial word, page or citation quota applies.',
      'Adapt body sections for reviews, theoretical work and case studies. Write the main text in the selected language. Before publication prepare and verify an English title and abstract with the editorial office for international readers.',
      'Use one recognised citation style consistently. Include authors, year, title, publication and available DOI or URL. Verify each citation against its original source and cite only relevant works.',
      'All authors agree to submission and confirm that the manuscript is not being considered elsewhere. Enter every author and affiliation in the online form in the agreed order. Prepare a separate anonymised review copy and arrange delivery with the editor.',
      'Submit DOCX or a PDF exported from this template, up to 4 MB. Editors assess format and content. Completing the template does not guarantee acceptance or Scopus indexing.',
    ],
  },
  ru: {
    labels: ['Название', 'Контактный автор', 'Email', 'Организация', 'Страна', 'ORCID (при наличии)', 'Соавторы и организации'],
    abstract: 'Аннотация', keywords: 'Ключевые слова', declarations: 'Декларации', references: 'Литература', instructions: 'КАК ИСПОЛЬЗОВАТЬ ШАБЛОН',
    sections: ['Введение', 'Материалы и методы', 'Результаты', 'Обсуждение', 'Заключение'],
    statements: ['Вклад авторов', 'Финансирование', 'Конфликт интересов', 'Доступность данных и кода', 'Этическое одобрение и согласие', 'Использование генеративного ИИ'],
    notes: [
      'Замените все поля {{...}} фактическими сведениями. Для неприменимой декларации напишите «Не применимо» с объяснением. Удалите эту страницу инструкций перед подачей.',
      'Во введении опишите проблему, предыдущие исследования, пробел в знаниях и конкретную цель. Объясните дизайн, выборку, источники, измерения и анализ достаточно подробно для оценки и воспроизведения.',
      'Представьте результаты с доказательствами. Нумеруйте таблицы и рисунки, указывайте подписи и единицы измерения. Обсудите предыдущие работы, научный вклад, значение и ограничения. Не вводите новые результаты в заключение.',
      'Аннотация должна самостоятельно раскрывать цель, методы, основные результаты и значение. Ключевые слова описывают тему и методы. Искусственной квоты слов, страниц или цитирований нет.',
      'Адаптируйте разделы для обзоров, теоретических работ и описаний случаев. Основной текст остаётся на выбранном языке. Перед публикацией подготовьте и проверьте с редакцией английские название и аннотацию для международных читателей.',
      'Последовательно используйте один признанный стиль цитирования. Укажите авторов, год, название, издание и доступный DOI или URL. Проверяйте ссылки по первоисточникам и цитируйте только подходящие работы.',
      'Все авторы согласны с подачей и подтверждают, что рукопись не рассматривается другим журналом. Внесите всех авторов и организации в онлайн-форму в согласованном порядке. Подготовьте отдельную обезличенную копию и согласуйте передачу с редакцией.',
      'Подайте DOCX или PDF, экспортированный из шаблона, до 4 МБ. Редакция проверяет оформление и содержание. Заполнение шаблона не гарантирует принятия или индексации в Scopus.',
    ],
  },
} as const;

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;

export async function generateManuscriptTemplate(lang: Language) {
  const c = copy[lang], s = manuscriptStandard;
  const zip = new JSZip();
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const relationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const p = (text: string, style = 'Normal') => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
  const metadata = ['TITLE', 'AUTHOR', 'EMAIL', 'AFFILIATION', 'COUNTRY', 'ORCID', 'COAUTHORS'];
  const sections = ['INTRODUCTION', 'METHODS', 'RESULTS', 'DISCUSSION', 'CONCLUSION'];
  const declarations = ['AUTHOR_CONTRIBUTIONS', 'FUNDING', 'COMPETING_INTERESTS', 'DATA_AVAILABILITY', 'ETHICS_AND_CONSENT', 'AI_DISCLOSURE'];
  const body = [
    ...c.labels.map((label, i) => p(`${label}: {{${metadata[i]}}}`, i ? 'Author' : 'Title')),
    p(c.abstract, 'Heading1'), p('{{ABSTRACT}}', 'Abstract'), p(`${c.keywords}: {{KEYWORDS}}`, 'Abstract'),
    ...c.sections.flatMap((heading, i) => [p(`${i + 1}. ${heading}`, 'Heading1'), p(`{{${sections[i]}}}`)]),
    p(c.declarations, 'Heading1'), ...c.statements.map((label, i) => p(`${label}: {{${declarations[i]}}}`, 'Declaration')),
    p(c.references, 'Heading1'), p('{{REFERENCES}}', 'Reference'),
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>', p(c.instructions, 'Heading1'),
    p(`AGM Journal · ${s.version} · ${s.date}`, 'Note'), p(manuscriptStandardCopy[lang].summary, 'Note'),
    ...c.notes.map(note => p(note, 'Note')),
  ].join('');
  const margin = Math.round(s.marginMm / 25.4 * 1440), indent = Math.round(s.firstLineMm / 25.4 * 1440);
  zip.file('[Content_Types].xml', xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[['document', 'document.main'], ['styles', 'styles'], ['header1', 'header'], ['footer1', 'footer']].map(([part, type]) => `<Override PartName="/word/${part}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`));
  zip.file('_rels/.rels', xml(`<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`));
  zip.file('word/_rels/document.xml.rels', xml(`<Relationships xmlns="${relationships}">${[['styles', 'styles'], ['header', 'header1'], ['footer', 'footer1']].map(([type, target]) => `<Relationship Id="rId${type}" Type="${office}/${type}" Target="${target}.xml"/>`).join('')}</Relationships>`));
  zip.file('word/document.xml', xml(`<w:document xmlns:w="${ns}" xmlns:r="${office}"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdheader"/><w:footerReference w:type="default" r:id="rIdfooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="567" w:footer="567"/><w:pgNumType w:start="1"/></w:sectPr></w:body></w:document>`));
  const styles = [
    ['Normal', `<w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/><w:ind w:firstLine="${indent}"/><w:jc w:val="both"/><w:widowControl/></w:pPr>`],
    ['Title', '<w:pPr><w:keepNext/><w:spacing w:before="120" w:after="180"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="102B3F"/></w:rPr>'],
    ['Author', '<w:pPr><w:keepNext/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:spacing w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr>'],
    ['Heading1', '<w:pPr><w:keepNext/><w:keepLines/><w:outlineLvl w:val="0"/><w:ind w:firstLine="0"/><w:spacing w:before="180" w:after="80"/></w:pPr><w:rPr><w:b/><w:color w:val="0D6163"/></w:rPr>'],
    ['Abstract', '<w:pPr><w:ind w:firstLine="0"/><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr>'],
    ['Declaration', '<w:pPr><w:ind w:firstLine="0"/><w:spacing w:after="80"/></w:pPr>'],
    ['Reference', '<w:pPr><w:ind w:left="567" w:hanging="567"/><w:spacing w:after="100"/></w:pPr>'],
    ['Note', '<w:pPr><w:ind w:firstLine="0"/><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="475569"/></w:rPr>'],
  ];
  const wordLang = { uz: 'uz-Latn-UZ', ru: 'ru-RU', en: 'en-GB' }[lang];
  zip.file('word/styles.xml', xml(`<w:styles xmlns:w="${ns}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${s.font}" w:hAnsi="${s.font}" w:cs="${s.font}" w:eastAsia="${s.font}"/><w:sz w:val="${s.fontSize * 2}"/><w:szCs w:val="${s.fontSize * 2}"/><w:lang w:val="${wordLang}"/></w:rPr></w:rPrDefault></w:docDefaults>${styles.map(([id, properties]) => `<w:style w:type="paragraph" w:styleId="${id}"${id === 'Normal' ? ' w:default="1"' : ''}><w:name w:val="${id}"/>${id !== 'Normal' ? '<w:basedOn w:val="Normal"/>' : ''}${properties}</w:style>`).join('')}</w:styles>`));
  zip.file('word/header1.xml', xml(`<w:hdr xmlns:w="${ns}">${p('AGM JOURNAL  /  MANUSCRIPT', 'Note')}</w:hdr>`));
  zip.file('word/footer1.xml', xml(`<w:ftr xmlns:w="${ns}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>AGM Journal · ${s.version}   |   </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`));
  zip.file('docProps/core.xml', xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>AGM Journal — ${c.instructions}</dc:title><dc:creator>AGM Journal</dc:creator><dc:language>${lang}</dc:language><cp:version>${s.version}</cp:version></cp:coreProperties>`));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
