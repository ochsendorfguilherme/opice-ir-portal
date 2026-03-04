const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/data/activities.js');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace status values for all DEFAULT_ACTIVITIES
content = content.replace(/status:\s*["'](?:Feito|Em andamento|Não se aplica)["']/g, 'status: "Planejado"');

fs.writeFileSync(targetPath, content);
console.log('Fixed statuses in activities.js');
