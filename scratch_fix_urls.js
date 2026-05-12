const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('client/src/components');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace 'http://localhost:5000/api/...' with `http://${window.location.hostname}:5000/api/...`
  // We need to be careful with quotes.
  
  // Replace simple string quotes
  content = content.replace(/'http:\/\/localhost:5000([^']*)'/g, '`http://${window.location.hostname}:5000$1`');
  content = content.replace(/"http:\/\/localhost:5000([^"]*)"/g, '`http://${window.location.hostname}:5000$1`');
  
  // Replace template literals that already have backticks
  content = content.replace(/`http:\/\/localhost:5000([^`]*)`/g, '`http://${window.location.hostname}:5000$1`');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

console.log('Done fixing URLs');
