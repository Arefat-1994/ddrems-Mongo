const { execSync } = require('child_process');
const path = require('path');

console.log('Installing report dependencies...\n');

try {
  const clientPath = path.join(__dirname, 'client');
  process.chdir(clientPath);
  
  console.log('Installing chart.js, react-chartjs-2, jspdf, jspdf-autotable, xlsx...');
  execSync('npm install chart.js react-chartjs-2 jspdf jspdf-autotable xlsx', { stdio: 'inherit' });
  
  console.log('\n✅ Report dependencies installed successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
