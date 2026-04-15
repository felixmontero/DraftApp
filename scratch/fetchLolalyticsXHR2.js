const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
       console.log('XHR/FETCH:', request.url());
    }
    request.continue();
  });

  try {
    await page.goto('https://lolalytics.com/lol/akali/build/', { waitUntil: 'networkidle0' });
  } catch (err) {
    console.error('Goto error:', err);
  }

  await browser.close();
})();
