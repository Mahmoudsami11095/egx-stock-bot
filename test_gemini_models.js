const https = require('https');

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log('⚠️ Please provide a Gemini API Key as an argument or set GEMINI_API_KEY.');
  console.log('Usage: node test_gemini_models.js YOUR_API_KEY');
  process.exit(0);
}

const modelsToTest = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.1-pro'
];

function testModel(modelName) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: 'What is your exact model name and version?' }]
      }],
      generationConfig: { maxOutputTokens: 150 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            resolve({ model: modelName, status: 'ERROR', error: json.error.message || json.error.status });
          } else {
            const reply = json.candidates?.[0]?.content?.parts?.[0]?.text || 'No text';
            resolve({ model: modelName, status: 'SUCCESS', reply: reply.trim() });
          }
        } catch (e) {
          resolve({ model: modelName, status: 'ERROR', error: 'Parse Error' });
        }
      });
    });

    req.on('error', err => resolve({ model: modelName, status: 'ERROR', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ model: modelName, status: 'TIMEOUT' }); });
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log(`🔍 Testing ${modelsToTest.length} Gemini API Models...\n`);
  for (const m of modelsToTest) {
    process.stdout.write(`Testing [${m}]... `);
    const result = await testModel(m);
    if (result.status === 'SUCCESS') {
      console.log(`✅ SUCCESS\n   Reply: "${result.reply}"\n`);
    } else {
      console.log(`❌ ${result.status} (${result.error || 'Timeout'})\n`);
    }
  }
}

runTests();
