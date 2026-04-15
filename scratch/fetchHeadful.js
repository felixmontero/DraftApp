const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  await page.setRequestInterception(true);
  let found = [];
  
  page.on('request', request => {
    const url = request.url();
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
       if (url.includes('lolalytics') && !url.includes('.json')) {
           found.push(url);
           console.log('API FETCH:', url);
       }
    }
    request.continue();
  });

  try {
    await page.goto('https://lolalytics.com/lol/akali/build/', { waitUntil: 'networkidle2' });
    console.log('Navigated...');
    await new Promise(r => setTimeout(r, 8000)); // wait for client-side fetches
    console.log('Found so far:', found);
  } catch (err) {
    console.error('Goto error:', err);
  }

  await browser.close();
})();
