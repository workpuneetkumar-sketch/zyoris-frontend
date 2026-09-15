const fs = require('fs');

async function inspectSwagger() {
  const docObj = JSON.parse(fs.readFileSync('scratch/swagger-doc.json', 'utf8'));

  const targetPaths = [
    '/workspace/search',
    '/workspace/my-tasks',
    '/tasks/my-tasks',
    '/workspace/tasks/assignment-events',
    '/tasks/assignment-events',
  ];

  console.log('--- TARGET SWAGGER PATHS ---');
  for (const p of targetPaths) {
    if (docObj.paths[p]) {
      console.log(`\n=== PATH: ${p} ===`);
      console.log(JSON.stringify(docObj.paths[p], null, 2));
    } else {
      console.log(`\n=== PATH: ${p} NOT FOUND EXACTLY, SEARCHING KEYWORDS ===`);
    }
  }

  console.log('\n--- SEARCHING ALL PATHS CONTAINING "search", "my-tasks", "assignment" ---');
  for (const pathKey in docObj.paths) {
    if (pathKey.includes('search') || pathKey.includes('my-tasks') || pathKey.includes('assignment')) {
      console.log(`Path match: ${pathKey}`);
      console.log(JSON.stringify(docObj.paths[pathKey], null, 2));
    }
  }
}

inspectSwagger().catch(console.error);
