const stocksHandler = require('../api/stocks.js');

const mockReq = { method: 'GET', query: { source: 'tradingview' } };
const mockRes = {
  headers: {},
  setHeader(k, v) { this.headers[k] = v; },
  status(code) {
    this.statusCode = code;
    return {
      json: (data) => {
        console.log('STATUS:', code);
        console.log('HEADERS:', this.headers);
        console.log('DATA COUNT:', Array.isArray(data) ? data.length : data);
      },
      end: () => console.log('ENDED')
    };
  }
};

stocksHandler(mockReq, mockRes).catch(err => console.error('HANDLER ERROR:', err));
