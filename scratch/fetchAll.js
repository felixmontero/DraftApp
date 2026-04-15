const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    // Log absolute ALL requests going to lolalytics that are not assets
    const url = request.url();
    if (url.includes('lolalytics.com') && !url.includes('.webp') && !url.includes('.png') && !url.includes('.js') && !url.includes('.css')) {
       console.log('REQ:', request.resourceType(), url);
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
