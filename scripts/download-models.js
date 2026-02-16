
const fs = require('fs');
const path = require('path');
const https = require('https');

const FILES = [
    'resources.json',
    'isnet_fp16.onnx', // Main model
    'isnet_quint8.onnx', // Quantized model (optional)
    'imgly_background_removal.wasm', // Wasm runtime
    'imgly_background_removal-simd.wasm' // SIMD Wasm runtime
];

const BASE_URL = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
const DEST_DIR = path.join(process.cwd(), 'public', 'models');

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

async function downloadFile(filename) {
    const url = BASE_URL + filename;
    const dest = path.join(DEST_DIR, filename);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                fs.unlink(dest, () => { }); // Delete failed file
                // Try to ignore optional files if they don't exist
                console.warn(`⚠️ Failed to download ${filename} (Status: ${response.statusCode})`);
                resolve(false);
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded: ${filename}`);
                resolve(true);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            console.error(`❌ Error downloading ${filename}: ${err.message}`);
            reject(err);
        });
    });
}

async function main() {
    console.log('--- Downloading @imgly Models ---');
    for (const file of FILES) {
        try {
            await downloadFile(file);
        } catch (e) {
            // Continue even if fail
        }
    }
    console.log('--- Done ---');
}

main();
