const fs = require('fs');
const cp = require('child_process');

if (fs.existsSync('./frontend/package.json')) {
  console.log('Building frontend from root directory...');
  cp.execSync('npm run build --prefix frontend', { stdio: 'inherit' });
} else {
  console.log('Building frontend from frontend directory...');
  cp.execSync('npm run build', { stdio: 'inherit' });
}
