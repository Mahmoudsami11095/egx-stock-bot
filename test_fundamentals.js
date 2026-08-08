const handler = require('./frontend/api/fundamentals.js');

// Mock request and response
const req = {
  method: 'GET',
  query: {
    symbol: 'NIPH',
    name: 'El-Nile Co. for Pharmaceuticals & Chemical Industries'
  },
  headers: {
    'x-gemini-key': process.env.GEMINI_API_KEY // Ensure you have this in your environment or set a default
  }
};

const res = {
  setHeader: (key, value) => { },
  status: (code) => {
    return {
      json: (data) => {
        console.log(`Status: ${code}`);
        console.log('Response:', JSON.stringify(data, null, 2));
      },
      end: () => console.log('Ended')
    }
  }
};

require('dotenv').config(); // Assuming you have .env in the root
if (!req.headers['x-gemini-key']) {
    console.error("Please provide a GEMINI_API_KEY in .env");
} else {
    handler(req, res);
}
