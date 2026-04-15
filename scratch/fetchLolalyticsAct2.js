const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    if (request.url().includes('q-data.json') || request.url().includes('.json')) {
      console.log('JSON FETCH:', request.url());
    }
    request.continue();
  });

  try {
    await page.goto('https://lolalytics.com/lol/akali/build/', { waitUntil: 'networkidle0' });
    console.log('Page loaded, navigating to middle lane...');
    await page.evaluate(() => {
       const links = Array.from(document.querySelectorAll('a'));
       const mid = links.find(l => l.href.includes('lane=middle'));
       if (mid) mid.click();
       else console.log('Mid link not found');
    });
    await new Promise(r => setTimeout(r, 4000));
  } catch (err) {
    console.error('Goto error:', err);
  }

  await browser.close();
})();
