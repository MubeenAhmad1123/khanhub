const fs = require('fs');
const path = 'c:/Users/pc/Desktop/khanhub/apps/web/src/app/hq/dashboard/manager/staff/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace \${isDark ? '...' : '...'}
content = content.replace(/\$\{isDark \? '([^']*)' : '([^']*)'\}/g, '$2');
// Replace isDark ? '...' : '...' outside template literals
content = content.replace(/isDark \? '([^']*)' : '([^']*)'/g, "'$2'");

// Replace brutalist classes
content = content.replace(/border-4 border-black shadow-\[4px_4px_0px_0px_rgba\(0,0,0,1\)\] hover:translate-x-0\.5 hover:translate-y-0\.5 hover:shadow-none/g, 'shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200');

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
