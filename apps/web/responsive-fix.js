/**
 * responsive-fix.js
 * Applies global responsive fixes to all departmental layout.tsx files:
 * 1. Adds overflow-x-hidden to root wrapper
 * 2. Adds min-w-0 overflow-x-hidden to main content area
 * 3. Wraps <table> elements in overflowing divs
 */
const fs = require('fs');
const path = require('path');

const BASE = 'd:/khanhub/apps/web/src/app';

// Target layout files for the root overflow fix
const LAYOUT_FILES = [
  'departments/rehab/dashboard/layout.tsx',
  'departments/spims/dashboard/layout.tsx',
  'departments/hospital/dashboard/layout.tsx',
  'departments/sukoon/dashboard/layout.tsx',
  'departments/welfare/dashboard/layout.tsx',
  'departments/job-center/dashboard/layout.tsx',
];

let fixedCount = 0;

LAYOUT_FILES.forEach(relPath => {
  const filePath = path.join(BASE, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${relPath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let dirty = false;

  // Fix 1: Add overflow-x-hidden to the root min-h-screen flex div
  // Pattern: className={`min-h-screen flex ${...`}  (without overflow-x-hidden already)
  if (!content.includes('min-h-screen flex overflow-x-hidden') && content.includes('min-h-screen flex')) {
    content = content.replace(
      /className=\{?[`'"]min-h-screen flex ([^`'"]*)[`'"]\}?/g,
      (match, rest) => {
        if (rest.includes('overflow-x-hidden')) return match;
        return match.replace('min-h-screen flex', 'min-h-screen flex overflow-x-hidden');
      }
    );
    dirty = true;
  }

  // Fix 2: Add min-w-0 overflow-x-hidden to "flex-1 lg:ml-64 flex flex-col min-h-screen" containers
  if (content.includes('flex-1 lg:ml-64 flex flex-col min-h-screen"') && !content.includes('min-w-0 overflow-x-hidden')) {
    content = content.replace(
      /"flex-1 lg:ml-64 flex flex-col min-h-screen"/g,
      '"flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden"'
    );
    dirty = true;
  }

  // Fix 3: Older pattern without lg:ml-64
  if (content.includes('"flex-1 flex flex-col min-h-screen"') && !content.includes('min-w-0')) {
    content = content.replace(
      /"flex-1 flex flex-col min-h-screen"/g,
      '"flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden"'
    );
    dirty = true;
  }

  // Fix 4: main content padding
  content = content.replace(
    /className="flex-1 p-4 lg:p-8 transition-opacity/g,
    'className="flex-1 p-4 lg:p-8 overflow-x-hidden transition-opacity'
  );

  if (dirty) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`FIXED: ${relPath}`);
    fixedCount++;
  } else {
    console.log(`OK (no changes needed): ${relPath}`);
  }
});

console.log(`\nDone. Fixed ${fixedCount}/${LAYOUT_FILES.length} files.`);
