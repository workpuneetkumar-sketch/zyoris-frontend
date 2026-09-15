const fs = require('fs');
const docObj = JSON.parse(fs.readFileSync('scratch/swagger-doc.json', 'utf8'));

console.log(JSON.stringify(docObj.paths['/attachments'].post, null, 2));
