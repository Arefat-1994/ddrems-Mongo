const http = require('http');

const checkPort = (port) => {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
            console.log(`✅ Port ${port} is active (Status: ${res.statusCode})`);
            resolve(true);
        });

        req.on('error', (err) => {
            console.log(`❌ Port ${port} is not responding: ${err.message}`);
            resolve(false);
        });

        req.end();
    });
};

const checkApi = () => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/properties',
            method: 'GET'
        };

        const req = http.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`✅ API /api/properties is working, found ${json.length} properties`);
                    resolve(true);
                } catch (e) {
                    console.log(`❌ API returned non-JSON: ${data.substring(0, 50)}...`);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ API error: ${err.message}`);
            resolve(false);
        });

        req.end();
    });
};

async function diagnostic() {
    console.log('=== DDREMS System Diagnostic ===\n');
    await checkPort(3000);
    await checkPort(5000);
    await checkApi();
    console.log('\n=== Diagnostic Complete ===');
    process.exit(0);
}

diagnostic();
