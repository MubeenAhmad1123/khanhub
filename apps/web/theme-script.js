const fs = require('fs');

const file = 'd:/khanhub/apps/web/src/app/hq/dashboard/superadmin/approvals/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexes = [
  { p: /\bbg-white(?!(\/| dark:))/g, r: 'bg-white dark:bg-[#111111]' },
  { p: /\bbg-gray-50(?! dark:)/g, r: 'bg-gray-50 dark:bg-white/5' },
  { p: /\bbg-gray-100(?! dark:)/g, r: 'bg-gray-100 dark:bg-white/10' },
  { p: /\bborder-gray-100(?! dark:)/g, r: 'border-gray-100 dark:border-white/10' },
  { p: /\bborder-gray-200(?! dark:)/g, r: 'border-gray-200 dark:border-white/10' },
  { p: /\bborder-gray-300(?! dark:)/g, r: 'border-gray-300 dark:border-white/20' },
  { p: /\border-t border-gray-100(?! dark:)/g, r: 'border-t border-gray-100 dark:border-white/10' },
  { p: /\btext-gray-900(?! dark:)/g, r: 'text-gray-900 dark:text-white' },
  { p: /\btext-gray-800(?! dark:)/g, r: 'text-gray-800 dark:text-gray-100' },
  { p: /\btext-gray-700(?! dark:)/g, r: 'text-gray-700 dark:text-gray-200' },
  { p: /\btext-gray-600(?! dark:)/g, r: 'text-gray-600 dark:text-gray-300' },
  { p: /\btext-gray-500(?! dark:)/g, r: 'text-gray-500 dark:text-gray-400' },
  { p: /\btext-gray-400(?! dark:)/g, r: 'text-gray-400 dark:text-gray-500' },
  { p: /\bhover:bg-gray-50(?! dark:)/g, r: 'hover:bg-gray-50 dark:hover:bg-white/10' },
  { p: /\bhover:bg-gray-100(?! dark:)/g, r: 'hover:bg-gray-100 dark:hover:bg-white/10' },
  // specific to buttons and text that needs an explicit dark mode inversion
  { p: /\bbg-blue-50(?! dark:)/g, r: 'bg-blue-50 dark:bg-blue-900/30' },
  { p: /\btext-blue-700(?! dark:)/g, r: 'text-blue-700 dark:text-blue-400' },
  { p: /\btext-blue-600(?! dark:)/g, r: 'text-blue-600 dark:text-blue-400' },
  { p: /\bborder-blue-100(?! dark:)/g, r: 'border-blue-100 dark:border-blue-900/50' },
  { p: /\bhover:bg-blue-100(?! dark:)/g, r: 'hover:bg-blue-100 dark:hover:bg-blue-900/50' },
  { p: /\bbg-amber-50(?! dark:)/g, r: 'bg-amber-50 dark:bg-amber-900/30' },
  { p: /\btext-amber-800(?! dark:)/g, r: 'text-amber-800 dark:text-amber-400' },
  { p: /\bbg-green-50(?! dark:)/g, r: 'bg-green-50 dark:bg-green-900/30' },
  { p: /\btext-green-800(?! dark:)/g, r: 'text-green-800 dark:text-green-400' },
  { p: /\bbg-red-50(?! dark:)/g, r: 'bg-red-50 dark:bg-red-900/30' },
  { p: /\btext-red-800(?! dark:)/g, r: 'text-red-800 dark:text-red-400' },
  { p: /\bdivide-gray-100(?! dark:)/g, r: 'divide-gray-100 dark:divide-white/10' },
];

regexes.forEach(({ p, r }) => {
  content = content.replace(p, r);
});

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated Approvals page for dark mode.');
