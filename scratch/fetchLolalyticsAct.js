const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
       if (request.url().includes('lolalytics')) {
           console.log('API FETCH:', request.url());
       }
    }
    request.continue();
  });

  try {
    await page.goto('https://lolalytics.com/lol/akali/build/', { waitUntil: 'networkidle0' });
    console.log('Page loaded, clicking on another lane to trigger fetch...');
    // The lanes are links like <a href="/lol/akali/build/?lane=middle" ...>
    // Or we can just click on a lane icon.
    // The lane icons usually have 'lane' or 'middle' in their alt/title.
    await page.click('img[alt="middle"]');
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.error('Goto error:', err);
  }

  await browser.close();
})();
