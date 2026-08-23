const https = require('https');

https.get('https://stockastic.app/assets/index-Dg1QMrd4.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const dynamicImports = b.match(/import\s*\(\s*["']([^"']+)["']\s*\)/g);
    console.log('Dynamic imports:', dynamicImports);
    
    // Also look for __vitePreload or chunks
    const preloadMatches = b.match(/"([^"]+\.js)"/g);
    const jsFiles = (preloadMatches || []).filter(m => m.includes('/assets/') || m.includes('.js'));
    console.log('JS files mentioned:', jsFiles);
  });
});
