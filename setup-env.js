const fs = require('fs');
const path = require('path');

const envExamplePath = path.join(__dirname, 'backend', '.env.example');
const envPath = path.join(__dirname, 'backend', '.env');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('Successfully created backend/.env from backend/.env.example');
  } else {
    console.warn('backend/.env.example not found. Please create backend/.env manually.');
  }
} else {
  console.log('backend/.env already exists.');
}
