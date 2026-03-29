const fs = require('fs');

// Read the file
let content = fs.readFileSync('server/routes/real-estate-agreement.js', 'utf8');

// Replace all instances of ar.created_at with ar.request_date
content = content.replace(/ar\.created_at/g, 'ar.request_date');

// Replace all instances of created_at in agreement_requests context with request_date
content = content.replace(/ORDER BY ar\.created_at DESC/g, 'ORDER BY ar.request_date DESC');

// Write back
fs.writeFileSync('server/routes/real-estate-agreement.js', content);

console.log('✅ Fixed all created_at references to request_date');
