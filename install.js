const fs = require('fs');
const cp = require('child_process');

if (fs.existsSync('./frontend/package.json')) {
  console.log('Building from repository root...');
  cp.execSync('npm install --prefix frontend', { stdio: 'inherit' });
} else {
  console.log('Building from frontend directory...');
  cp.execSync('npm install', { stdio: 'inherit' });
}
