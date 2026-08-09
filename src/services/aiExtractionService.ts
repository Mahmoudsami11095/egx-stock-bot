import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';
import { NewsSnippet } from './newsScraperService';

export interface ExtractedFundamentals {
  netProfit: number | null;
  revenue: number | null;
  periodMonths: number | null;
  totalShares: number | null;
  dps: number | null;
  isCurrentPeriod: boolean | null;
  fiscalYear: string | null;
  currency: string | null;
}

export class AiExtractionService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      logger.warn('⚠️ GEMINI_API_KEY is not set. AI Extraction will be disabled.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Passes the scraped news snippets to Gemini to extract financial results.
   */
  public async extractFundamentalsFromNews(snippets: NewsSnippet[]): Promise<ExtractedFundamentals | null> {
    if (!process.env.GEMINI_API_KEY || snippets.length === 0) return null;

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const combinedText = snippets.map(s => `[Date: ${s.pubDate}]\nTitle: ${s.title}\nSnippet: ${s.snippet}`).join('\n\n');

      const prompt = `
You are an expert financial analyst AI specialized in extracting Egyptian Exchange (EGX) disclosures.
Read the following Arabic news snippets about a company's financial results.

CRITICAL DISCLOSURE RULES:
1. ALWAYS extract the CURRENT reported figure for the latest period, NOT historical comparison figures.
   - Example: If text says "سجلت صافي أرباح 1.138 مليار جنيه عن عام 2025 مقابل 2.539 مليار جنيه في 2024", you MUST output netProfit as 1138000000 (current 2025 result) and IGNORE 2.539B (the prior comparison year).
2. Extract numerical values in exact base EGP (e.g. 1.138 مليار = 1138000000, 540 مليون = 540000000).
3. Determine periodMonths:
   - "الربع الأول" / 3 أشهر = 3
   - "النصف الأول" / 6 أشهر = 6
   - "9 أشهر" / الربع الثالث = 9
   - "سنوية" / "عام كامل" / 12 شهر = 12
4. Extract totalShares (عدد الأسهم) and dps (توزيعات الأرباح للسهم / كوبون) if explicitly stated in text, else output null.
5. Set isCurrentPeriod to true when netProfit/revenue clearly refer to the latest/current reporting period; false when only prior-year comparison figures are available; null if unclear.
6. Ignore any figure introduced by comparison prepositions: "مقابل", "مقارنة بـ", "عن العام السابق", "في العام السابق".
7. If no clear current result is found, output null for fields.

Respond ONLY with a valid JSON object matching this schema:
{
  "netProfit": number | null,
  "revenue": number | null,
  "periodMonths": 3 | 6 | 9 | 12 | null,
  "totalShares": number | null,
  "dps": number | null,
  "isCurrentPeriod": boolean | null,
  "fiscalYear": string | null,
  "currency": string | null
}

News Text:
${combinedText}
      `;

      logger.info(`🤖 [AiExtraction] Querying Gemini API for fundamental data...`);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const parsedData = JSON.parse(responseText) as ExtractedFundamentals;
      logger.info(`✅ [AiExtraction] Extracted Fundamentals: ${JSON.stringify(parsedData)}`);
      
      return parsedData;

    } catch (error) {
      logger.error(`❌ [AiExtraction] Failed to extract fundamentals: ${error}`);
      return null;
    }
  }
}
