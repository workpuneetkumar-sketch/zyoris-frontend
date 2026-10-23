const fs = require('fs');

let buf = fs.readFileSync('scratch/swagger-init.js');
let content;
if (buf[0] === 0xff && buf[1] === 0xfe) {
  content = buf.toString('utf16le');
} else {
  content = buf.toString('utf8');
}

const lines = content.split(/\r?\n/);
let specLines = ['{'];
for (let i = 11; i < lines.length; i++) {
  if (lines[i].includes('"customOptions"')) {
    break;
  }
  specLines.push(lines[i]);
}

let specStr = specLines.join('\n').trim();
if (specStr.endsWith(',')) specStr = specStr.slice(0, -1);

const spec = JSON.parse(specStr);
fs.writeFileSync('scratch/live_spec.json', JSON.stringify(spec, null, 2), 'utf8');
console.log('Successfully saved scratch/live_spec.json! Path count:', Object.keys(spec.paths).length);
const relevant = Object.keys(spec.paths).filter(p => p.includes('task') || p.includes('export') || p.includes('attach'));
console.log('Relevant paths:\n' + relevant.join('\n'));
