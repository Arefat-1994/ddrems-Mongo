const axios = require('axios');

async function check() {
    const endpoints = [
        'http://localhost:5000/api/profiles/customer',
        'http://localhost:5000/api/profiles/owner',
        'http://localhost:5000/api/profiles/broker',
        'http://localhost:5000/api/profiles/pending'
    ];

    for (const url of endpoints) {
        try {
            const res = await axios.get(url);
            console.log(`\nURL: ${url}`);
            console.log(`Status: ${res.status}`);
            if (url.endsWith('pending')) {
                console.log(`Response: ${JSON.stringify(res.data)}`);
            } else {
                console.log(`Count: ${res.data.length}`);
                if (res.data.length > 0) {
                    console.log(`First item status: ${res.data[0].profile_status}`);
                }
            }
        } catch (err) {
            console.error(`Error ${url}: ${err.message}`);
            if (err.response) {
                console.log(`Response data: ${JSON.stringify(err.response.data)}`);
            }
        }
    }
}

check();
