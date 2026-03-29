const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const urls = [
            'http://localhost:5000/api/profiles/customer',
            'http://localhost:5000/api/profiles/owner',
            'http://localhost:5000/api/profiles/broker'
        ];

        console.log('Testing Profile Endpoints...');
        for (const url of urls) {
            try {
                const res = await axios.get(url);
                console.log(`\nURL: ${url}`);
                console.log(`Status: ${res.status}`);
                console.log(`Count: ${res.data.length}`);
                if (res.data.length > 0) {
                    const first = res.data[0];
                    console.log(`Keys in first record: ${Object.keys(first).join(', ')}`);
                    console.log(`First record profile_status: "${first.profile_status}"`);
                    console.log(`Full first record: ${JSON.stringify(first)}`);
                }
            } catch (err) {
                console.error(`Error fetching ${url}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('Fatal error:', err.message);
    }
}

test();
