const fs = require('fs');
const cp = require('child_process');
const path = require('path');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync('./frontend/package.json')) {
  console.log('Building frontend from repository root...');
  cp.execSync('npm run build --prefix frontend', { stdio: 'inherit' });
  if (fs.existsSync('./frontend/dist')) {
    copyDirSync('./frontend/dist', './dist');
  }
} else {
  console.log('Building frontend from frontend directory...');
  cp.execSync('npm run build', { stdio: 'inherit' });
  if (fs.existsSync('./dist')) {
    copyDirSync('./dist', './frontend/dist');
  }
}
