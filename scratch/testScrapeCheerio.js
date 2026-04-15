const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const { data } = await axios.get('https://lolalytics.com/lol/akali/build/?lane=middle');
  const $ = cheerio.load(data);
  
  // STATS
  // Usually the win rate is in a large font near the top. But since everything is minified, identifying by text usually works.
  // The structure often is: <div><div>Win Rate</div><div>48.5%</div></div>
  let winRate = 0, pickRate = 0, banRate = 0;
  
  $('div').each((i, el) => {
    const t = $(el).text();
    if (t === 'Win Rate') {
       const val = $(el).next().text() || $(el).parent().text();
       const match = val.match(/([\d.]+)%/);
       if (match) winRate = parseFloat(match[1]);
    }
    if (t === 'Pick Rate') {
       const match = $(el).parent().text().match(/([\d.]+)%/);
       if (match && !pickRate) pickRate = parseFloat(match[1]);
    }
    if (t === 'Ban Rate') {
       const match = $(el).parent().text().match(/([\d.]+)%/);
       if (match && !banRate) banRate = parseFloat(match[1]);
    }
  });

  // TIER
  // Tier is usually an image or text.
  let tier = 'C';
  const tierImg = $('img[src*="/tier/"], img[src*="/emblem"]').first().attr('src');
  if (tierImg) {
    const match = tierImg.match(/(emerald|diamond|platinum|gold|silver|bronze|iron|challenger|grandmaster|master)/i);
    if (match) tier = match[1];
  } else {
    // maybe text?
    $('div').each((i, el) => {
       if ($(el).text() === 'Tier') {
          tier = $(el).parent().text().replace('Tier', '').trim();
       }
    });
  }

  // BUILD ITEMS
  const items = [];
  $('img[src*="/item64/"]').each((i, el) => {
    const m = $(el).attr('src').match(/\/item64\/(\d+)\.webp/);
    if (m && items.length < 10) items.push(Number(m[1]));
  });

  // RUNES
  const runes = [];
  $('img[src*="/rune68/"]').each((i, el) => {
    const m = $(el).attr('src').match(/\/rune68\/(\d+)\.webp/);
    if (m && runes.length < 15) runes.push(Number(m[1]));
  });

  console.log({ winRate, pickRate, banRate, tier, items, runes });
}
test();
