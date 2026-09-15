const fs = require('fs');

async function main() {
  const r = await fetch('https://zyoris.onrender.com/docs/swagger-ui-init.js');
  const text = await r.text();
  
  const match = text.match(/let options = (\{[\s\S]*?\});\s*swaggerUi\.setup/);
  if (match) {
    fs.writeFileSync('scratch/swagger-init-options.js', match[1]);
    console.log('Saved options');
  }

  // Find all attachment paths
  const idx = text.indexOf('"paths":');
  console.log('paths index:', idx);

  // Evaluate or extract swaggerDoc
  const swaggerDocMatch = text.match(/"swaggerDoc":\s*(\{[\s\S]*?\})\s*,\s*"customOptions"/);
  if (swaggerDocMatch) {
    const docObj = JSON.parse(swaggerDocMatch[1]);
    fs.writeFileSync('scratch/swagger-doc.json', JSON.stringify(docObj, null, 2));
    
    const attachmentPaths = {};
    for (const p in docObj.paths) {
      if (p.includes('attachment')) {
        attachmentPaths[p] = docObj.paths[p];
      }
    }
    console.log('--- ATTACHMENT ENDPOINTS IN SWAGGER ---');
    console.log(JSON.stringify(attachmentPaths, null, 2));

    const attachmentSchemas = {};
    if (docObj.components && docObj.components.schemas) {
      for (const s in docObj.components.schemas) {
        if (s.toLowerCase().includes('attachment')) {
          attachmentSchemas[s] = docObj.components.schemas[s];
        }
      }
    }
    console.log('--- ATTACHMENT SCHEMAS IN SWAGGER ---');
    console.log(JSON.stringify(attachmentSchemas, null, 2));
  } else {
    console.log('Could not regex match swaggerDoc directly, writing raw init text');
    fs.writeFileSync('scratch/raw-swagger-init.js', text);
  }
}

main().catch(console.error);
