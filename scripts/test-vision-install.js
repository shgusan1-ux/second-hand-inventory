const vision = require('@google-cloud/vision');

// Load environment variables locally if not already loaded
// (In Next.js this is handled automatically, but for script we might need manual load or just check process.env)
// Since we put it in .env.local, we'll try to read it manually for this test script if dotenv is available,
// or just rely on Vercel environment simulation if running via 'vercel dev'.
// But for a quick node check, let's just interpret the .env.local file directly.

const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        const lines = envConfig.split('\n');
        lines.forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2];
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[match[1]] = value;
            }
        });
    }
} catch (e) {
    console.log('Error reading .env.local:', e.message);
}

async function testVision() {
    console.log('----------------------------------------');
    console.log('🔍 Google Vision API Environment Check');
    console.log('----------------------------------------');

    // Check if credentials env var is present
    if (process.env.GOOGLE_VISION_CREDENTIALS_JSON) {
        console.log('✅ GOOGLE_VISION_CREDENTIALS_JSON found in environment.');
        try {
            const creds = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS_JSON);
            console.log(`✅ Credentials parsed successfully. Project ID: ${creds.project_id}`);
            console.log(`✅ Client Email: ${creds.client_email}`);

            // Initialize client
            const client = new vision.ImageAnnotatorClient({ credentials: creds });
            console.log('✅ Vision Client initialized without error.');
            console.log('🚀 Ready to use!.');

        } catch (e) {
            console.error('❌ Failed to parse credentials JSON:', e.message);
        }
    } else {
        console.error('❌ GOOGLE_VISION_CREDENTIALS_JSON NOT found in environment variables.');
        console.log('   Please ensure .env.local is correctly set.');
    }
}

testVision();
