const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'swagger-live.js');
const text = fs.readFileSync(file, 'utf8');

const key = '"swaggerDoc": ';
const idx = text.indexOf(key);
if (idx !== -1) {
  const start = idx + key.length;
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end !== -1) {
    const jsonStr = text.substring(start, end);
    const spec = JSON.parse(jsonStr);
    fs.writeFileSync(path.join(__dirname, '..', 'live_spec.json'), JSON.stringify(spec, null, 2));
    console.log('Saved live_spec.json! Total paths:', Object.keys(spec.paths).length);
  } else {
    console.log('Could not find end bracket');
  }
} else {
  console.log('Key not found');
}
