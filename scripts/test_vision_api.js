const vision = require('@google-cloud/vision');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testVision() {
    console.log('Testing Google Vision API...');

    try {
        const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS_JSON);
        const client = new vision.ImageAnnotatorClient({ credentials });

        // A sample public image URL (Google Logo)
        const fileName = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';

        console.log(`Analyzing image: ${fileName}`);
        const [result] = await client.labelDetection(fileName);
        const labels = result.labelAnnotations;

        console.log('Labels identified:');
        labels.forEach(label => console.log(`- ${label.description} (${Math.round(label.score * 100)}%)`));

        if (labels.length > 0) {
            console.log('\n✅ Google Vision API is working correctly!');
        } else {
            console.log('\n⚠️ No labels found, but the API call was successful.');
        }
    } catch (err) {
        console.error('\n❌ ERROR testing Google Vision API:');
        console.error(err.message);
        if (err.details) console.error(err.details);
    }
}

testVision();
