const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const { data } = await axios.get('https://lolalytics.com/lol/diana/build/?lane=middle', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    });

    // Qwik usually puts state in a script tag with type "qwik/json" or var qwikState
    const qwikJson = data.match(/<script type="qwik\/json">([\s\S]*?)<\/script>/);
    if (qwikJson) {
       console.log('Found qwik/json');
       const state = JSON.parse(qwikJson[1]);
       
       // Just print some keys to see if we can find the data
       console.log(Object.keys(state));
       
       // Dump first 300 bytes of JSON
       console.log(qwikJson[1].slice(0, 300));
    } else {
       console.log('No qwik/json, trying to find NEXT_DATA or other patterns');
    }

  } catch (e) {
    console.error(e.message);
  }
}

test();
