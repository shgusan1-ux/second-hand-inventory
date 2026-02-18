
import fs from 'fs';

async function listModels() {
    try {
        const envProd = fs.readFileSync('.env.production', 'utf8');
        const getVal = (key) => {
            const line = envProd.split('\n').find(l => l.includes(key + '='));
            if (!line) return '';
            const match = line.match(new RegExp(`${key}="(.+?)"`));
            return match ? match[1].replace(/\\n/g, '').trim() : '';
        };

        const KEY = getVal('GEMINI_API_KEY');
        console.log('Using Key:', KEY.substring(0, 10));

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.log('Error Listing Models:', JSON.stringify(data.error));
        } else {
            console.log('Available Models:', data.models.map(m => m.name).join(', '));
            const flash = data.models.find(m => m.name.includes('flash'));
            if (flash) console.log('Flash Model Info:', JSON.stringify(flash));
        }
    } catch (e) {
        console.log('FETCH ERROR:', e.message);
    }
}

listModels();
