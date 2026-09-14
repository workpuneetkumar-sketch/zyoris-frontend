const fs = require('fs');

const docObj = JSON.parse(fs.readFileSync('scratch/swagger-doc.json', 'utf8'));

const routes = ['/attachments', '/attachments/{id}', '/attachments/{id}/archive', '/attachments/{id}/download', '/attachments/{id}/preview'];

routes.forEach((route) => {
  console.log('====================================================');
  console.log('ROUTE:', route);
  console.log('====================================================');
  if (docObj.paths[route]) {
    console.log(JSON.stringify(docObj.paths[route], null, 2));
  }
});
