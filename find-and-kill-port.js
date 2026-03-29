// Find and kill process using port 5000
const { exec } = require('child_process');

console.log('🔍 Finding process on port 5000...\n');

// Try to find the process
exec('netstat -ano', (error, stdout, stderr) => {
  if (error) {
    console.log('⚠️  Could not run netstat. Trying alternative method...\n');
    
    // Alternative: Just kill all node processes
    exec('taskkill /F /IM node.exe', (err, out) => {
      if (err) {
        console.log('❌ Could not kill Node processes');
        console.log('Please close all Node.js windows manually and try again.\n');
      } else {
        console.log('✅ Killed all Node.js processes');
        console.log('Port 5000 should now be free!\n');
      }
    });
    return;
  }
  
  const lines = stdout.split('\n');
  const pids = new Set();
  
  lines.forEach(line => {
    if (line.includes(':5000') && line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && !isNaN(pid)) {
        pids.add(pid);
      }
    }
  });
  
  if (pids.size === 0) {
    console.log('✅ No process found on port 5000');
    console.log('You can now start the server!\n');
    return;
  }
  
  console.log(`Found ${pids.size} process(es) on port 5000:\n`);
  
  let killed = 0;
  pids.forEach(pid => {
    console.log(`Killing PID ${pid}...`);
    exec(`taskkill /F /PID ${pid}`, (err, out) => {
      killed++;
      if (err) {
        console.log(`  ⚠️  Could not kill PID ${pid}`);
      } else {
        console.log(`  ✅ Killed PID ${pid}`);
      }
      
      if (killed === pids.size) {
        console.log('\n✅ All processes killed!');
        console.log('Port 5000 is now free. You can start the server.\n');
      }
    });
  });
});
