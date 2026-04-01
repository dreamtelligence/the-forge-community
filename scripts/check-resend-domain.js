const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function checkDomains() {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.error('No API key found');
    return;
  }
  const resend = new Resend(apiKey);

  try {
    const domains = await resend.domains.list();
    console.log('Domains:', JSON.stringify(domains, null, 2));
  } catch (error) {
    console.error('Error fetching domains:', error);
  }
}

checkDomains();
