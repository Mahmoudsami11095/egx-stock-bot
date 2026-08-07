const handler = require('./api/stocks.js');
const req = { method: 'GET' };
const res = {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => {
      console.log('Status:', code);
      console.log('Returned data length:', data.length);
      if(data.length > 0) {
        console.log('Keys of first item:', Object.keys(data[0]));
        console.log('shortTermRec:', data[0].shortTermRec);
        console.log('longTermRec:', data[0].longTermRec);
      }
    },
    end: () => console.log('Ended with status', code)
  })
};

handler(req, res).catch(console.error);
