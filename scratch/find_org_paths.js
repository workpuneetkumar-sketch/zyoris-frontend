const fs = require('fs');

try {
  const swagger = JSON.parse(fs.readFileSync('scratch/swagger-doc.json', 'utf8'));
  const paths = swagger.paths || {};
  console.log("Matching /organization or /auth paths in swagger:");
  for (const path of Object.keys(paths)) {
    if (path.includes('organization') || path.includes('member') || path.includes('invite')) {
      console.log(path, Object.keys(paths[path]));
    }
  }
} catch (e) {
  console.error("Error reading swagger:", e.message);
}
