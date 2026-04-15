const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const { data } = await axios.get('https://lolalytics.com/lol/akali/build/?lane=middle&patch=14.8', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    const $ = cheerio.load(data);
    
    // Find Win Rate
    // Win Rate is usually near "Win Rate", so let's check text
    const textNodes = $('*').contents().filter(function() {
      return this.type === 'text';
    });
    
    // Check if we can find 48.xx% 
    console.log('Title:', $('title').text());

    // Usually metrics are in some flex containers.
    // Let's find elements containing "Win" or "Pick"
    const metrics = [];
    $('div').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Win') && text.includes('%')) {
           if (text.length < 50) metrics.push(text);
        }
    });
    console.log('Metrics containing Win:', [...new Set(metrics)]);

  } catch (e) {
    console.error(e.message);
  }
}

test();
