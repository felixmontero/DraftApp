const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const { data } = await axios.get('https://lolalytics.com/lol/akali/build/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    });
    
    // Buscar en los scripts
    const $ = cheerio.load(data);
    const scripts = $('script').map((i, el) => $(el).html()).get();
    
    // Imprimir las coincidencias con 'mega' o 'axe.' o 'a1.' o 'lolalytics.com'
    scripts.forEach(s => {
      if (s && (s.includes('mega') || s.includes('axe') || s.includes('a1.lolalytics.com'))) {
        console.log('--- ENCONTRADO EN SCRIPT ---');
        // Imprimir las lineas con coincidencia
        s.split('\n').forEach(line => {
          if (line.includes('mega') || line.includes('axe') || line.includes('a1.lolalytics.com')) {
            console.log(line);
          }
        });
      }
    });

  } catch (e) {
    console.error(e.message);
  }
}

test();
