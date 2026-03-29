const axios = require('axios');

async function testUpdate() {
    try {
        // First get a user to get a valid ID
        const res = await axios.get('http://localhost:5000/api/users');
        if (res.data.length === 0) {
            console.log('No users found to test update.');
            return;
        }

        const user = res.data[0];
        console.log(`Testing update for user ID: ${user.id} (${user.name})`);

        const updateRes = await axios.put(`http://localhost:5000/api/users/${user.id}`, {
            status: user.status === 'active' ? 'suspended' : 'active'
        });

        console.log('Update Success:', updateRes.data);
    } catch (err) {
        if (err.response) {
            console.error(`Update Failed with status ${err.response.status}:`, err.response.data);
        } else {
            console.error('Update Failed:', err.message);
        }
    }
}

testUpdate();
