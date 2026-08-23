import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM to download data/egx-live.json...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');

  conn.exec('cat /home/azureuser/egx-stock-bot/data/egx-live.json', (err, stream) => {
    if (err) {
      console.error('❌ Error executing cat:', err);
      conn.end();
      return;
    }

    const chunks: Buffer[] = [];
    stream.on('close', (code: number) => {
      const buffer = Buffer.concat(chunks);
      const jsonStr = buffer.toString('utf-8');
      
      try {
        const data = JSON.parse(jsonStr);
        console.log(`✅ Received ${data.length} EGX official stock records! (${buffer.length} bytes)`);

        const p1 = path.join(__dirname, '..', '..', 'data', 'egx-live.json');
        const p2 = path.join(__dirname, '..', '..', 'frontend', 'data', 'egx-live.json');

        fs.mkdirSync(path.dirname(p1), { recursive: true });
        fs.mkdirSync(path.dirname(p2), { recursive: true });

        fs.writeFileSync(p1, jsonStr, 'utf-8');
        fs.writeFileSync(p2, jsonStr, 'utf-8');
        console.log(`💾 Saved to ${p1} and ${p2}`);
      } catch (e: any) {
        console.error('Error parsing JSON:', e.message);
      }

      conn.end();
    }).on('data', (data: Buffer) => {
      chunks.push(data);
    }).stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '20.91.240.54',
  port: 2222,
  username: 'azureuser',
  password: 'azureuserSami@11095',
  tryKeyboard: true,
  readyTimeout: 30000
});
