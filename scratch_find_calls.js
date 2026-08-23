const https = require('https');

https.get('https://stockastic.app/assets/company-D4L7HxyN.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const fetchMatches = b.match(/(\.get|\.post|fetch)\s*\(\s*[`'"][^`'"]+[`'"]/g);
    console.log('HTTP calls in company chunk:', fetchMatches);
  });
});
