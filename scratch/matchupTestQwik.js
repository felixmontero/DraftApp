const fs = require('fs');

const data = fs.readFileSync('akali.html', 'utf-8');

const qwikMatch = data.match(/<script type="qwik\/json">([\s\S]*?)<\/script>/);
if (qwikMatch) {
   const state = JSON.parse(qwikMatch[1]);
   // find the index of "Ahri" in state.objs
   const id = state.objs.indexOf("Ahri");
   console.log("Ahri is at index", id);
   // See where 'id' is referenced in objs or subs.
   
   // Generally, Qwik stores objects flattening their properties.
}
