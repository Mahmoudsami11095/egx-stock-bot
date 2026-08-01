const https = require('https');

// Test the actual Gemini API call with a short timeout
const postData = JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
  generationConfig: { temperature: 0.4, maxOutputTokens: 100 }
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models/gemini-3.6-flash:generateContent',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': 'test-key',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 5000
};

console.log('Starting request at', new Date().toISOString());
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response received at', new Date().toISOString());
    console.log('Status:', res.statusCode);
    console.log('Body:', body.substring(0, 200));
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log('Error:', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('Request timeout at', new Date().toISOString());
  req.destroy();
  process.exit(1);
});

req.write(postData);
req.end();

// Keep process alive
setTimeout(() => {
  console.log('Global timeout - still hanging after 10s');
  process.exit(1);
}, 10000);
