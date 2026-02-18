
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log('--- Model Names ---');
        data.models.forEach(m => {
            if (m.name.includes('flash') || m.name.includes('gemini-pro') || m.name.includes('2.0')) {
                console.log(m.name);
            }
        });
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

listModels();
