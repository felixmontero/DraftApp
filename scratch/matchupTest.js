const fs = require('fs');
const cheerio = require('cheerio');

const data = fs.readFileSync('akali.html', 'utf-8');
const $ = cheerio.load(data);

const matchups = [];

$('a[href*="/lol/akali/build/"]').each((i, el) => {
    // some links go to specific matchups if they click on another champion.
});
// A better way: any link that points to a champion matchup for akali.
// Looking into typical Qwik rendered elements, let's find champion icons inside href tags:
$('a').each((i, el) => {
   const href = $(el).attr('href');
   if (href && href.match(/\/lol\/akali\/vs\/([a-z]+)\/build/)) {
       const m = href.match(/\/lol\/akali\/vs\/([a-z]+)\/build/);
       const champ = m[1];
       const text = $(el).text();
       const wrMatch = text.match(/([\d.]+)%/);
       if (wrMatch) {
            matchups.push({champKey: champ, wr: wrMatch[1], text });
       }
   }
});

console.log(matchups.slice(0, 5));
// If none, maybe the matchup link format is different? e.g. /lol/val[1]/vs/akali ?
if (matchups.length === 0) {
    const backup = [];
    $('img[src*="/champ"]').each((i, el) => {
        const spanText = $(el).parent().parent().text();
        if (spanText.includes('%')) {
           backup.push({ img: $(el).attr('src'), txt: spanText });
        }
    });
    console.log('BACKUP SEARCH:', backup.slice(0,5));
}
