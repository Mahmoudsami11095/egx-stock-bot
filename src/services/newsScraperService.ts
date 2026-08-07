import Parser from 'rss-parser';
import { logger } from './logger';

export interface NewsSnippet {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
}

export class NewsScraperService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Fetches recent news for a specific EGX stock from Google News.
   * Targets Arabic financial keywords to find earnings/results.
   */
  public async fetchRecentFinancialNews(stockNameAr: string): Promise<NewsSnippet[]> {
    try {
      // Build Google News RSS query focusing on the stock name + earnings/revenues keywords
      const query = `"${stockNameAr}" (أرباح OR إيرادات OR نتائج أعمال)`;
      const encodedQuery = encodeURIComponent(query);
      const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ar&gl=EG&ceid=EG:ar`;

      logger.info(`📰 [NewsScraper] Fetching news for: ${stockNameAr}`);
      const feed = await this.parser.parseURL(url);

      // Return the top 3 most relevant news snippets
      return feed.items.slice(0, 3).map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        snippet: item.contentSnippet || item.title || ''
      }));
    } catch (error) {
      logger.error(`❌ [NewsScraper] Error fetching news for ${stockNameAr}: ${error}`);
      return [];
    }
  }
}
