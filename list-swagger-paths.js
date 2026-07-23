
const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, 'swagger.json');
const data = fs.readFileSync(specPath, 'utf8');
const spec = JSON.parse(data);

console.log('=== All Swagger Paths ===');
for (const path in spec.paths) {
    const methods = Object.keys(spec.paths[path]);
    console.log(`${methods.map(m => m.toUpperCase()).join(', ')} ${path}`);
}
