const express = require('express');
const app = express();
const cors = require('cors');

// Mock dependencies
const router = require('./server/routes/users');

app.use(cors());
app.use(express.json());
app.use('/api/users', router);

function print(path, layer) {
    if (layer.route) {
        layer.route.stack.forEach(print.bind(null, path + layer.route.path));
    } else if (layer.name === 'router' && layer.handle.stack) {
        layer.handle.stack.forEach(print.bind(null, path + (layer.regexp.source.replace('^', '').replace('\\/?(?=\\/|$)', ''))));
    } else if (layer.method) {
        console.log('%s /%s', layer.method.toUpperCase(), path.replace(/\/$/, ''));
    }
}

console.log('--- Registered Routes ---');
app._router.stack.forEach(print.bind(null, ''));
console.log('-------------------------');
