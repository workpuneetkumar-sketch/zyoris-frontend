
const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, 'swagger.json');
const data = fs.readFileSync(specPath, 'utf8');
const spec = JSON.parse(data);

const output = [];
for (const p in spec.paths) {
    const methods = Object.keys(spec.paths[p]);
    output.push(`${methods.map(m => m.toUpperCase()).join(',')} ${p}`);
}

fs.writeFileSync(path.join(__dirname, 'swagger-paths.txt'), output.join('\n'), 'utf8');
console.log('Wrote swagger-paths.txt');
