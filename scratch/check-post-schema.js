const fs = require('fs');

const content = fs.readFileSync('./scratch/swagger-init.js', 'utf8');
const startIdx = content.indexOf('"swaggerDoc":');
const jsonStart = content.indexOf('{', startIdx);
let depth = 0, jsonEnd = -1;
for (let i = jsonStart; i < content.length; i++) {
  if (content[i] === '{') depth++;
  else if (content[i] === '}') {
    depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
}
const spec = JSON.parse(content.substring(jsonStart, jsonEnd));
const postPages = spec.paths['/workspace/pages']?.post;
console.log('POST /workspace/pages details:', JSON.stringify(postPages, null, 2));

// Check schemas
if (spec.components && spec.components.schemas) {
  console.log('Schemas starting with CreatePage or Page:', Object.keys(spec.components.schemas).filter(s => s.toLowerCase().includes('page')));
  for (const [sName, sBody] of Object.entries(spec.components.schemas)) {
    if (sName.toLowerCase().includes('page')) {
      console.log(`Schema ${sName}:`, JSON.stringify(sBody, null, 2));
    }
  }
}
