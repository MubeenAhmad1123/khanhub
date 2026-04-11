/**
 * table-responsive-fix.js
 * Wraps bare <table> tags in a div.table-responsive for horizontal scrolling on small screens.
 * Also fixes flex filter bars to use flex-wrap.
 * Only applied to HQ superadmin pages.
 */
const fs = require('fs');
const path = require('path');

const BASE = 'd:/khanhub/apps/web/src/app';

// Pages that have tables or filter bars needing responsiveness
const PAGES = [
  'hq/dashboard/superadmin/approvals/page.tsx',
  'hq/dashboard/superadmin/finance/page.tsx',
  'hq/dashboard/superadmin/users/page.tsx',
  'hq/dashboard/superadmin/staff/page.tsx',
  'hq/dashboard/superadmin/audit/page.tsx',
  'hq/dashboard/superadmin/reconciliation/page.tsx',
  'hq/dashboard/manager/attendance/page.tsx',
  'hq/dashboard/manager/reports/page.tsx',
  'hq/dashboard/manager/users/page.tsx',
  'hq/dashboard/cashier/history/page.tsx',
  'hq/dashboard/cashier/page.tsx',
];

let totalFixed = 0;

PAGES.forEach(relPath => {
  const filePath = path.join(BASE, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${relPath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let dirty = false;

  // Fix 1: Wrap <table with a scrollable container
  // Match opening <table that is NOT already inside a table-responsive div on that line
  if (content.includes('<table') && !content.includes('table-responsive')) {
    // Regex: find <table lines and wrap them
    content = content.replace(
      /(\s*)(<table\b)/g,
      (match, indent, tag) => {
        return `${indent}<div className="table-responsive">\n${indent}${tag}`;
      }
    );
    // Find matching </table> and close the wrapper div after it
    // This is tricky - easier to do a simpler pattern: replace all </table> with </table>\n</div>
    content = content.replace(/<\/table>/g, '</table>\n              </div>');
    dirty = true;
  }

  // Fix 2: Make standalone filter bars use flex-wrap
  // Pattern: className="flex gap-2" or "flex gap-3" on a filter container without flex-wrap
  content = content.replace(
    /className="(flex gap-[23] (?:mb-\d+|mt-\d+|my-\d+)?)"/g,
    (match, classes) => {
      if (classes.includes('flex-wrap')) return match;
      return `className="${classes} flex-wrap"`;
    }
  );

  // Fix 3: Tab bars - add overflow-x-auto and whitespace-nowrap to tab containers
  // Pattern: flex gap-X overflow-... (already handled by tabs-scrollable in CSS)
  // Just ensure tab bars that use flex gap have overflow-x-auto
  content = content.replace(
    /className="(flex gap-[23] (?:overflow-x-auto|pb-2)[^"]*)"/g,
    (match) => match  // already fine
  );

  if (dirty) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`FIXED: ${relPath}`);
    totalFixed++;
  } else {
    console.log(`OK: ${relPath}`);
  }
});

console.log(`\nDone. Fixed ${totalFixed} files.`);
