import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';
import { NewsSnippet } from './newsScraperService';

export interface ExtractedFundamentals {
  netProfit: number | null;
  revenue: number | null;
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

      const combinedText = snippets.map(s => `${s.title}\n${s.snippet}`).join('\n\n');

      const prompt = `
You are a highly accurate financial data extraction AI.
Read the following Arabic news snippets about an Egyptian company's financial results.
Extract the company's net profit (صافي الربح) and revenue (الإيرادات) and the fiscal year they correspond to.

Rules:
1. Extract numbers as raw numerical values in millions (e.g., if the text says "263.52 مليون جنيه", output 263520000).
2. If a value is not found in the text, output null for that field.
3. Respond ONLY with a valid JSON object strictly matching this schema:
{
  "netProfit": number | null,
  "revenue": number | null,
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
