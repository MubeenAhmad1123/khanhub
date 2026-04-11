const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let dirty = false;

    // Fix Tables
    if (content.includes('<table') && !content.includes('overflow-x-auto')) {
      // Very naive addition: If someone has a simple table and no overflow string nearby, we might just add a wrapper or class directly.
      // Easiest is to add a global CSS fix to globals.css and avoid messing up JSX tables.
    }

    // Let's just fix the transaction cards and generic flex wrappers that are not responsive.
    // For transaction cards: `flex gap-X` without `flex-col`.
    const cardRegex = /className="(.*?flex .*?)"/g;
    content = content.replace(cardRegex, (match, p1) => {
        let replaced = false;
        
        // If it's a very generic flex, let's make it wrap
        if (p1.includes('flex gap-') && !p1.includes('flex-col') && !p1.includes('flex-wrap') && !p1.includes('sm:flex-row') && !p1.includes('md:flex-row')) {
           // We ONLY want to apply this to known things like filter bars or tx cards
           // It's dangerous to do globally. Let's do it on filter/actions bars.
        }
        return match;
    });

}

// walkDir('d:/khanhub/apps/web/src/app', processFile);
