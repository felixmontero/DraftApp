const axios = require('axios');

async function test() {
  try {
    const { data } = await axios.get('https://lolalytics.com/lol/akali/build/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    });

    const urls = data.match(/https?:\/\/[a-z0-9.-]*lolalytics\.com\/[^\s"']*/g);
    if (urls) {
        console.log(Array.from(new Set(urls)).join('\n'));
    }

  } catch (e) {
    console.error(e.message);
  }
}

test();
