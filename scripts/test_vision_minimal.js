const vision = require('@google-cloud/vision');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testVision() {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS_JSON);
        const client = new vision.ImageAnnotatorClient({ credentials });
        const fileName = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
        const [result] = await client.labelDetection(fileName);
        const labels = result.labelAnnotations;
        console.log('SUCCESS: Vision API returned ' + labels.length + ' labels.');
        labels.slice(0, 3).forEach(l => console.log('LABEL: ' + l.description));
    } catch (err) {
        console.log('FAILURE: ' + err.message);
    }
}
testVision();
