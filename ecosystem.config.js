module.exports = {
  apps: [
    {
      name: 'connect-agent',
      script: './backend/dist/server.js',
      cwd: './backend',
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES || 'max',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8083,
        BACKEND_URL: 'http://3.110.88.42:8083'
      }
    }
  ]
};
