import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM (20.91.240.54) to execute curl_cffi against EGX Beta...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');
  
  const script = `
cd /home/azureuser/test_impersonate

cat << 'EOF' > test_egx.py
import json
from curl_cffi import requests

print(">>> Testing EGX Beta with curl_cffi (Chrome 124 TLS & HTTP/2 Impersonation)...")
session = requests.Session(impersonate="chrome124")

# 1. First visit landing page to get cookies
r1 = session.get("https://beta.egx.com.eg/en/market/market-watch")
print(f"Landing page status: {r1.status_code}, Cookies received: {len(session.cookies)}")
for k, v in session.cookies.items():
    print(f"  Cookie: {k}={v[:25]}...")

# 2. Query market watch API
headers = {
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://beta.egx.com.eg/en/market/market-watch",
    "Origin": "https://beta.egx.com.eg",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin"
}

url = "https://beta.egx.com.eg/api/market/market-watch?Page=1&PageSize=5&SortBy=value&SortDescending=true"
r2 = session.get(url, headers=headers)
print("API Response Status:", r2.status_code)
print("API Response Length:", len(r2.text))

if "Request Rejected" in r2.text:
    print("❌ F5 WAF Blocked: 'Request Rejected' page received.")
    print("Snippet:", r2.text[:200])
else:
    try:
        data = r2.json()
        print("✅ SUCCESS! Clean JSON response received!")
        stocks = data.get("data", {}).get("data", [])
        print("Stocks count:", len(stocks))
        if stocks:
            print("Sample stock:", json.dumps(stocks[0], ensure_ascii=False))
    except Exception as e:
        print("Non-JSON Response:", r2.text[:300])
EOF

./venv/bin/python3 test_egx.py
`;

  conn.exec(script, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number) => {
      console.log(`\n🎉 Test finished with exit code ${code}!`);
      conn.end();
    }).on('data', (data: Buffer) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Error:', err.message);
}).connect({
  host: '20.91.240.54',
  port: 2222,
  username: 'azureuser',
  password: 'azureuserSami@11095',
  tryKeyboard: true,
  readyTimeout: 30000,
  keepaliveInterval: 5000
});
