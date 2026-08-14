import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via Port 2222 to Azure VM (20.91.240.54)...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established successfully on Port 2222!');
  
  const commands = [
    'echo azureuserSami@11095 | sudo -S ufw allow 3000/tcp',
    'echo azureuserSami@11095 | sudo -S fuser -k 3000/tcp || true',
    'echo azureuserSami@11095 | sudo -S pm2 delete egx-stock-bot || true',
    'echo azureuserSami@11095 | sudo -S bash -c "cd /root/egx-stock-bot && git clean -fd && git reset --hard HEAD && git pull && npm install --legacy-peer-deps && npm run build:backend && pm2 start dist/index.js --name egx-stock-bot && pm2 save && pm2 status"'
  ].join(' && ');

  console.log('🚀 Executing remote deployment commands on Azure VM...');

  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number, signal: string) => {
      console.log(`\n🎉 Remote deployment finished successfully with exit code ${code}!`);
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
  readyTimeout: 60000,
  keepaliveInterval: 5000
});
