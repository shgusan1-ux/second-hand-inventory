import http from 'http';
import fs from 'fs';

async function checkLocalhost() {
    const logFile = 'localhost_check.log';
    const timestamp = new Date().toISOString();
    let logContent = `--- Localhost Health Check [${timestamp}] ---\n`;

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/smartstore/products?fetchAll=true&size=1',
        method: 'GET',
        timeout: 5000
    };

    console.log('Checking http://localhost:3000...');

    const req = http.request(options, (res) => {
        logContent += `Status Code: ${res.statusCode}\n`;
        logContent += `Headers: ${JSON.stringify(res.headers, null, 2)}\n`;

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                logContent += `Payload Status: SUCCESS\n`;
                logContent += `Product Sample: ${JSON.stringify(parsed.data?.contents?.[0]?.name || 'No data')}\n`;
                if (parsed.data?.contents?.[0]?.inferredBrand) {
                    logContent += `AI Enrichment Check: PASSED (Found inferredBrand)\n`;
                }
            } catch (e) {
                logContent += `Payload Status: ERROR (Invalid JSON or body)\n`;
                logContent += `Raw Data Snippet: ${data.substring(0, 100)}\n`;
            }
            finish();
        });
    });

    req.on('error', (e) => {
        logContent += `Connection Status: FAILED\n`;
        logContent += `Error Message: ${e.message}\n`;
        finish();
    });

    req.on('timeout', () => {
        logContent += `Connection Status: TIMEOUT\n`;
        req.destroy();
        finish();
    });

    req.end();

    function finish() {
        logContent += `--- End of Report ---\n`;
        fs.appendFileSync(logFile, logContent);
        console.log(logContent);
    }
}

checkLocalhost();
