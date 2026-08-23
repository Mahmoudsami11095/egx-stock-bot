import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM (20.91.240.54)...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');
  
  const commands = [
    'echo azureuserSami@11095 | sudo -S pm2 restart egx-stock-bot',
    'sleep 2',
    'curl -s http://127.0.0.1:5000/api/intraday-trades'
  ].join(' && echo "\n---COMMAND-SEPARATOR---\n" && ');

  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number) => {
      console.log(`\n🎉 Commands executed with exit code ${code}!`);
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
