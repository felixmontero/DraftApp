const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('lolalytics.com') && !url.includes('.webp') && !url.includes('.png')) {
       console.log('RESPONSE:', url, ' TYPE:', response.request().resourceType());
    }
  });

  try {
    await page.goto('https://lolalytics.com/lol/akali/build/', { waitUntil: 'networkidle0' });
  } catch (err) {
    console.error('Goto error:', err);
  }

  await browser.close();
})();
