
const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, 'swagger.json');
const data = fs.readFileSync(specPath, 'utf8');
const spec = JSON.parse(data);

console.log('=== Looking for bulk endpoints ===\n');
for (const path in spec.paths) {
    if (path.includes('bulk')) {
        console.log('Path:', path);
        for (const method in spec.paths[path]) {
            const op = spec.paths[path][method];
            console.log('  Method:', method.toUpperCase());
            if (op.requestBody) {
                const body = op.requestBody.content['application/json'];
                if (body) {
                    console.log('  Request Body Schema:', JSON.stringify(body.schema, null, 4));
                }
            }
            if (op.responses) {
                console.log('  Responses:', Object.keys(op.responses));
            }
        }
        console.log('---\n');
    }
    if (path.includes('get-lead-score')) {
        console.log('=== get-lead-score endpoint ===\n');
        console.log('Path:', path);
        console.log('Methods:', Object.keys(spec.paths[path]));
        for (const method in spec.paths[path]) {
            const op = spec.paths[path][method];
            if (op.responses) {
                console.log('Responses schema:', JSON.stringify(op.responses['200']?.content?.['application/json']?.schema, null, 4));
            }
        }
        console.log('---\n');
    }
    if (['/leads/get-leads', '/leads/get-lead/{id}'].includes(path)) {
        console.log('===', path, 'endpoint ===\n');
        for (const method in spec.paths[path]) {
            const op = spec.paths[path][method];
            if (op.responses['200']?.content?.['application/json']) {
                console.log('Response schema:', JSON.stringify(op.responses['200'].content['application/json'].schema, null,4));
            }
        }
        console.log('---\n');
    }
}
