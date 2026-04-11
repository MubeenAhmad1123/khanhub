const fs = require('fs');

const file = 'd:/khanhub/apps/web/src/app/hq/dashboard/superadmin/approvals/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the typo 300 to 30
content = content.replace(/900\/300/g, '900/30');

// Fix the bad text-white concatenation
content = content.replace(/dark:text-gray-900 dark:text-white/g, 'dark:text-gray-900');

// Fix text-white on amber-400
content = content.replace(/bg-amber-400 text-gray-900 dark:text-white/g, 'bg-amber-400 text-gray-900');

// Fix toast overlay where bg-green-50 text-white is used
content = content.replace(/bg-green-50 dark:bg-green-90\/30 text-white/g, 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400');
content = content.replace(/bg-green-50 dark:bg-green-900\/30 text-white/g, 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400');
content = content.replace(/bg-red-50 dark:bg-red-900\/30 text-white/g, 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully refined theme classes for approvals/page.tsx');
