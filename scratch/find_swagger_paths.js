const fs = require('fs');

try {
  const swagger = JSON.parse(fs.readFileSync('scratch/swagger-doc.json', 'utf8'));
  const paths = swagger.paths || {};
  console.log("Matching paths in swagger:");
  for (const path of Object.keys(paths)) {
    if (path.includes('pin') || path.includes('save') || path.includes('communication') || path.includes('message')) {
      console.log(path, Object.keys(paths[path]));
    }
  }
} catch (e) {
  console.error("Error reading swagger:", e.message);
}
