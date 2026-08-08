const https = require('https');

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
  });
}

function extractSnippets(xml) {
  const snippets = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
    snippets.push(title);
  }
  return snippets;
}

// Mocking the translation function
async function getArabicName(companyName) {
  if (/[\u0600-\u06FF]/.test(companyName)) return companyName;
  console.log(`Translating ${companyName} to Arabic...`);
  // Pretend Gemini translated it
  return "النيل للأدوية";
}

async function test() {
  const symbol = "NIPH";
  const name = "El-Nile Co. for Pharmaceuticals & Chemical Industries";
  
  const arabicName = await getArabicName(name);
  console.log("Translated Name:", arabicName);

  let searchParts = [];
  if (symbol) searchParts.push(`"${symbol}"`);
  if (name) searchParts.push(`"${name}"`);
  if (arabicName && arabicName !== name) searchParts.push(`"${arabicName}"`);
  
  const searchQuery = searchParts.join(' OR ');
  const query = `(${searchQuery}) (أرباح OR إيرادات OR مبيعات OR نتائج أعمال)`;
  console.log("Final Query:", query);
  
  const xml = await fetchGoogleNews(query);
  console.log("Results:");
  console.log(extractSnippets(xml).slice(0, 5)); // Just show top 5
}

test();
