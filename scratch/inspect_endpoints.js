const fs = require('fs');
const path = require('path');

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'live_spec.json'), 'utf8'));

console.log('=== 1. SEARCH ENDPOINTS ===');
for (const p of Object.keys(spec.paths)) {
  if (p.includes('search')) {
    console.log(p, Object.keys(spec.paths[p]));
    console.log(JSON.stringify(spec.paths[p], null, 2));
  }
}

console.log('=== 2. MY TASKS & ASSIGNMENT EVENTS ENDPOINTS ===');
for (const p of Object.keys(spec.paths)) {
  if (p.includes('my-tasks') || p.includes('assignment-events')) {
    console.log(p, Object.keys(spec.paths[p]));
    console.log(JSON.stringify(spec.paths[p], null, 2));
  }
}

console.log('=== 3. PROJECT MEMBERS ENDPOINTS ===');
for (const p of Object.keys(spec.paths)) {
  if (p.includes('/projects/') && p.includes('member')) {
    console.log(p, Object.keys(spec.paths[p]));
    console.log(JSON.stringify(spec.paths[p], null, 2));
  }
}
