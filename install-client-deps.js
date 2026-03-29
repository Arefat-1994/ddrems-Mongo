const { execSync } = require('child_process');
const path = require('path');

console.log('Installing client dependencies...\n');

try {
  const clientPath = path.join(__dirname, 'client');
  process.chdir(clientPath);
  
  console.log('Installing axios...');
  execSync('npm install axios', { stdio: 'inherit' });
  
  console.log('\n✅ Client dependencies installed successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
