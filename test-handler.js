const handler = require('./frontend/api/chat.js');

const mockReq = {
  method: 'POST',
  body: {
    message: 'Test message',
    history: [],
    marketContext: {}
  },
  headers: {}
};

const mockRes = {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => {
      console.log('Status:', code);
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('Completed in', Date.now() - start, 'ms');
      process.exit(0);
    },
    end: () => {
      console.log('Ended');
      process.exit(0);
    }
  })
};

console.log('Testing API handler with NO API key...');
const start = Date.now();

handler(mockReq, mockRes).catch(err => {
  console.error('Handler error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('TIMEOUT after 30s - handler is hanging!');
  process.exit(1);
}, 30000);
