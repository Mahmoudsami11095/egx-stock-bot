const https = require('https');

const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash-lite'
];

function callGeminiSingleModel(systemInstruction, userMessage, historyMessages, apiKey, modelName) {
  const cleanKey = String(apiKey || '').trim();

  const contents = [];

  const fullUserPrompt = `${systemInstruction}\n\n[سؤال/طلب المستخدم الحالي]: ${userMessage}`;

  if (Array.isArray(historyMessages) && historyMessages.length > 0) {
    for (const msg of historyMessages.slice(-4)) {
      if (msg.text) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: fullUserPrompt }]
  });

  const postData = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2500
    }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 8000
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            resolve({ error: json.error.message || json.error.status });
          } else {
            const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve({ answer });
          }
        } catch (e) {
          resolve({ error: 'Failed to parse Gemini response' });
        }
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'Request timeout' }); });
    req.write(postData);
    req.end();
  });
}

async function callGeminiWithFailover(systemInstruction, userMessage, historyMessages, apiKey) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const res = await callGeminiSingleModel(systemInstruction, userMessage, historyMessages, apiKey, model);
    if (res.answer) {
      return { answer: res.answer, model };
    }
    if (res.error) {
      lastError = `${model}: ${res.error}`;
      if (res.error.includes('API_KEY') || res.error.includes('PERMISSION')) {
        break;
      }
    }
  }

  return { error: lastError || 'All Gemini models failed' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { message, history, marketContext, apiKey: bodyKey } = req.body || {};
    const rawKey = bodyKey || req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    const apiKey = String(rawKey || '').trim();

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemInstruction = `
أنت مستشار مالي واقتصادي خبير وحصيف في البورصة المصرية (EGX) وأسعار الذهب.
إليك بيانات السوق اللحظية الحالية:
${JSON.stringify(marketContext || {}, null, 2)}

قواعد الرد الصارمة:
1. اخرج إجابتك باللغة العربية الفصحى بشكل كامل ومباشر ومكتمل بدون أي قطع أو اختصار.
2. لا تذكر أي تعليمات إنجليزية أو خطوات تفكير داخلية إطلاقاً.
3. قدم تحليلاً كاملاً منظماً بجدول أو نقاط واضحة لكل سهم يطلبه المستخدم مع السعر، القيمة العادلة، نسبة النمو، والتوصية.
4. استخدم إيموجيات ملائمة (⚜️ 📈 🚀 💵 🎯 🛑).
`;

    const result = await callGeminiWithFailover(systemInstruction, message, history, apiKey);

    if (result.answer) {
      return res.status(200).json({
        answer: result.answer,
        provider: `Google ${result.model}`
      });
    }

    return res.status(200).json({
      useFallback: true,
      reason: 'GEMINI_ERROR',
      errorDetail: result.error
    });
  } catch (err) {
    console.error('Error in /api/chat Gemini Handler:', err);
    return res.status(200).json({
      useFallback: true,
      reason: 'SERVER_EXCEPTION',
      errorDetail: err.message
    });
  }
};
