const sharp = require('sharp');
const fs = require('fs');

const sizes = [128, 152, 384];

async function generate() {
    const input = 'public/icons/icon-512x512.png';
    for(let size of sizes) {
        const out = `public/icons/icon-${size}x${size}.png`;
        if(!fs.existsSync(out)) {
            await sharp(input)
                .resize(size, size)
                .toFile(out);
            console.log(`Generated ${size}x${size}`);
        }
    }
    // Rename maskable to fix mismatch
    if (fs.existsSync('public/icons/icon-512x512--maskable.png')) {
        fs.copyFileSync('public/icons/icon-512x512--maskable.png', 'public/icons/icon-512x512-maskable.png');
        console.log("Renamed maskable");
    }
}
generate().catch(console.error);
