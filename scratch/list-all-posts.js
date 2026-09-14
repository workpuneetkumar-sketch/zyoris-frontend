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

console.log('--- ALL POST PATHS IN SWAGGER ---');
for (const [path, methods] of Object.entries(spec.paths)) {
  if (methods.post) {
    console.log(`[POST] ${path}`);
    console.log(`  Summary: ${methods.post.summary || 'N/A'}`);
    console.log(`  Tags: ${(methods.post.tags || []).join(', ')}`);
    if (methods.post.requestBody?.content?.['application/json']?.schema) {
      const s = methods.post.requestBody.content['application/json'].schema;
      console.log('  Schema:', JSON.stringify(s, null, 2));
    }
    console.log('');
  }
}
