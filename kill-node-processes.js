// Kill all Node.js processes on port 5000
const { exec } = require('child_process');
const os = require('os');

console.log('🔧 Killing processes on port 5000...\n');

const platform = os.platform();

if (platform === 'win32') {
  // Windows
  exec('netstat -ano | findstr :5000', (error, stdout, stderr) => {
    if (stdout) {
      const lines = stdout.split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
      });
      
      if (pids.size > 0) {
        console.log(`Found ${pids.size} process(es) using port 5000`);
        pids.forEach(pid => {
          console.log(`Killing process ${pid}...`);
          exec(`taskkill /F /PID ${pid}`, (err, out) => {
            if (err) {
              console.log(`⚠️  Could not kill process ${pid}`);
            } else {
              console.log(`✅ Killed process ${pid}`);
            }
          });
        });
        
        setTimeout(() => {
          console.log('\n✅ Port 5000 should now be free!');
          console.log('You can now run: node server/index.js\n');
        }, 2000);
      } else {
        console.log('✅ No processes found on port 5000');
        console.log('You can now run: node server/index.js\n');
      }
    } else {
      console.log('✅ No processes found on port 5000');
      console.log('You can now run: node server/index.js\n');
    }
  });
} else {
  // Linux/Mac
  exec('lsof -ti:5000', (error, stdout, stderr) => {
    if (stdout) {
      const pids = stdout.trim().split('\n');
      console.log(`Found ${pids.length} process(es) using port 5000`);
      
      pids.forEach(pid => {
        console.log(`Killing process ${pid}...`);
        exec(`kill -9 ${pid}`, (err) => {
          if (err) {
            console.log(`⚠️  Could not kill process ${pid}`);
          } else {
            console.log(`✅ Killed process ${pid}`);
          }
        });
      });
      
      setTimeout(() => {
        console.log('\n✅ Port 5000 should now be free!');
        console.log('You can now run: node server/index.js\n');
      }, 1000);
    } else {
      console.log('✅ No processes found on port 5000');
      console.log('You can now run: node server/index.js\n');
    }
  });
}
