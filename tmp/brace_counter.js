
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Mirza Computers\\OneDrive\\Desktop\\khanhub\\apps\\web\\src\app\\hq\\dashboard\\manager\\users\\page.tsx', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
    }
    if (i >= 141 && i <= 470) {
        console.log(`${i + 1}: ${braceCount} | ${line.trim()}`);
    }
}
