const https = require('https');

const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// Fallback models for robust extraction
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

/**
 * Fetch raw RSS XML from Google News
 */
function fetchGoogleNews(query) {
  return new Promise((resolve) => {
    const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar&gl=EG&ceid=EG:ar`;
    const req = https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    
    req.on('error', () => resolve(''));
    req.on('timeout', () => {
      req.destroy();
      resolve('');
    });
  });
}

/**
 * Simple XML to plain text extractor for RSS items
 */
function extractSnippets(xml) {
  const snippets = [];
  // Match <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemData = match[1];
    const titleMatch = itemData.match(/<title>([\s\S]*?)<\/title>/);
    const descMatch = itemData.match(/<description>([\s\S]*?)<\/description>/);
    
    if (titleMatch || descMatch) {
      let text = (titleMatch ? titleMatch[1] : '') + " - " + (descMatch ? descMatch[1] : '');
      // Strip HTML tags and CDATA
      text = text.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
      text = text.replace(/<[^>]+>/g, ' ');
      // Decode HTML entities roughly
      text = text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      snippets.push(text.trim());
    }
  }
  return snippets;
}

/**
 * Single Gemini call
 */
function callGeminiSingleModel(prompt, apiKey, modelName) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1, // Strict extraction
        responseMimeType: "application/json"
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(String(apiKey).trim())}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 20000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            resolve({ error: json.error.message || 'Gemini API Error' });
            return;
          }
          if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
            const rawText = json.candidates[0].content.parts[0].text;
            // Clean markdown block if present
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const extracted = JSON.parse(cleanJson);
            resolve({ data: extracted });
          } else {
            resolve({ error: 'Unexpected response structure' });
          }
        } catch (e) {
          resolve({ error: 'Failed to parse Gemini response' });
        }
      });
    });

    req.on('error', (err) => resolve({ error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'Gemini request timeout' }); });
    req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { name, symbol } = req.query;
    
    if (!name && !symbol) {
      return res.status(400).json({ error: 'Missing company name or symbol parameter' });
    }

    const companyName = name || symbol; // Arabic name preferred for better Arabic news scraping
    const apiKey = req.headers['x-gemini-key'] || DEFAULT_GEMINI_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    // Helper to extract Arabic name if English
    async function getArabicName(companyName, apiKey) {
      if (/[\u0600-\u06FF]/.test(companyName)) return companyName; // Already contains Arabic
      
      const prompt = `What is the commonly known Arabic name of this Egyptian stock market company: "${companyName}"? Just reply with the short Arabic name without any extra text or symbols.`;
      
      let translatedName = companyName;
      for (const model of GEMINI_MODELS) {
        const resp = await callGeminiSingleModel(prompt, apiKey, model);
        if (resp.data && resp.data.trim()) {
          translatedName = resp.data.trim();
          break;
        }
      }
      return translatedName;
    }

    const arabicName = await getArabicName(name || symbol || '', apiKey);

    // 1. Fetch RSS News
    // By using the symbol alongside the name and Arabic translation, we ensure Arabic news is found
    let searchParts = [];
    if (symbol) searchParts.push(`"${symbol}"`);
    if (name) searchParts.push(`"${name}"`);
    if (arabicName && arabicName !== name) searchParts.push(`"${arabicName}"`);
    
    // Combine them with OR
    const searchQuery = searchParts.join(' OR ');
    const query = `(${searchQuery}) (أرباح OR إيرادات OR مبيعات OR نتائج أعمال)`;
    const rawXml = await fetchGoogleNews(query);
    const snippets = extractSnippets(rawXml);

    if (snippets.length === 0) {
      return res.status(200).json({ 
        message: 'No financial news found for this company recently.',
        fundamentals: { netProfit: null, revenue: null, fiscalYear: null, currency: null } 
      });
    }

    // 2. Prepare Gemini Prompt
    const prompt = `
استخرج الأرقام المالية للشركة المذكورة من مقتطفات الأخبار التالية بصرامة شديدة.
اسم الشركة: ${companyName}
القواعد:
1. ارجع فقط بصيغة JSON صحيحة. لا تكتب أي نصوص أخرى.
2. netProfit هو صافي الربح السنوي أو الفصلي.
3. revenue هو المبيعات أو الإيرادات.
4. fiscalYear هي السنة المالية أو الربع.
5. currency هي العملة (مثلا EGP).
6. يجب أن تكون الأرقام من نوع Number وليس String. (مثلا مليار جنيه = 1000000000).

الأخبار:
${snippets.slice(0, 5).join('\n---\n')}

يجب أن يكون الرد مطابقاً لهذا الهيكل فقط:
{
  "netProfit": 100000,
  "revenue": 500000,
  "fiscalYear": "2023",
  "currency": "EGP"
}
`;

    // 3. Call Gemini with failover
    let result = null;
    let lastError = null;
    
    for (const model of GEMINI_MODELS) {
      const resp = await callGeminiSingleModel(prompt, apiKey, model);
      if (resp.data) {
        result = resp.data;
        break;
      } else {
        lastError = resp.error;
        console.warn(`[Gemini Failover] ${model} failed:`, resp.error);
      }
    }

    if (result) {
      return res.status(200).json({ fundamentals: result, message: 'Extracted successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to extract fundamentals via AI', details: lastError });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
