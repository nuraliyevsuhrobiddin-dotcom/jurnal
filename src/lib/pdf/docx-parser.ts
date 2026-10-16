import mammoth from 'mammoth';

export interface ParsedDocxResult {
  success: boolean;
  htmlContent: string;
  rawText: string;
  extractedTitle?: string;
  extractedAbstract?: string;
  extractedKeywords?: string[];
  extractedReferences?: string[];
  wordCount: number;
  warnings: string[];
}

export async function parseDocxFile(buffer: Buffer): Promise<ParsedDocxResult> {
  try {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const textResult = await mammoth.extractRawText({ buffer });

    const rawText = textResult.value || '';
    const htmlContent = htmlResult.value || '';
    const warnings = htmlResult.messages.map(m => m.message);

    // Heuristic extraction
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    // 1. Extracted Title: typically first substantial line
    const extractedTitle = lines.length > 0 ? lines[0] : undefined;

    // 2. Extracted Abstract
    let extractedAbstract: string | undefined;
    const abstractMatch = rawText.match(/(?:abstract|annotatsiya|аннотация)[:\s]+([\s\S]*?)(?=(?:key\s*words|kalit\s+so[‘’ʻʼ'`]?zlar|ключевые слова|kirish|introduction|введение|$))/i);
    if (abstractMatch && abstractMatch[1]) {
      extractedAbstract = abstractMatch[1].trim();
    }

    // 3. Extracted Keywords
    let extractedKeywords: string[] | undefined;
    const keywordsMatch = rawText.match(/(?:key\s*words|kalit\s+so[‘’ʻʼ'`]?zlar|ключевые слова)[:\s]+([^\n\r]+)/i);
    if (keywordsMatch && keywordsMatch[1]) {
      extractedKeywords = keywordsMatch[1]
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 1);
    }

    // 4. Extracted References
    let extractedReferences: string[] | undefined;
    const refMatch = rawText.match(/(?:references|foydalanilgan adabiyotlar|adabiyotlar|список литературы)[:\s]+([\s\S]*)/i);
    if (refMatch && refMatch[1]) {
      extractedReferences = refMatch[1]
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 5);
    }

    return {
      success: true,
      htmlContent,
      rawText,
      extractedTitle,
      extractedAbstract,
      extractedKeywords,
      extractedReferences,
      wordCount,
      warnings,
    };
  } catch (error: unknown) {
    return {
      success: false,
      htmlContent: '',
      rawText: '',
      wordCount: 0,
      warnings: [(error instanceof Error ? error.message : null) || 'Failed to parse DOCX file'],
    };
  }
}
