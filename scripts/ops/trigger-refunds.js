require('dotenv').config({ path: '.env.local' });
const https = require('https');

const CRON_SECRET = process.env.CRON_SECRET || '';
const APP_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

const options = {
  hostname: new URL(APP_URL).hostname,
  port: new URL(APP_URL).port || 443,
  path: '/api/cron/energy-refund',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
