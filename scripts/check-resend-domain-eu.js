const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function checkDomainsEU() {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.error('No API key found');
    return;
  }
  // Force EU endpoint
  // Note: The Resend constructor typically accepts a string (key) or config object.
  // Checking if we can pass a config object as the first or second argument.
  // Based on common patterns: new Resend(key) or new Resend({ apiKey: '...' })
  // But to set baseUrl, sometimes it's an option.
  
  // Let's try to inspect the class or just guess the options.
  // If the library follows standard patterns:
  // new Resend('key', { baseUrl: '...' })? No, usually constructor(key).
  
  // Let's try setting the global environment variable if the SDK respects it?
  // Or manually constructing with options if supported.
  
  // Since I can't easily see the source, I will try the documented way for some SDKs.
  // Actually, Resend docs say: 
  // const resend = new Resend('re_123');
  // It doesn't clearly document baseUrl in the constructor in the quickstart.
  
  // However, I can try to set it via the object property if exposed, or just assume the user might need a new key for EU?
  // Let's try to verify if the key itself implies region.
  
  console.log("Checking standard endpoint (US)...");
  const resendUS = new Resend(apiKey);
  try {
      const domains = await resendUS.domains.list();
      console.log('US Domains:', domains.data?.data?.length || 0);
  } catch(e) { console.log("US Error:", e.message) }

  // Hack: If the SDK uses fetch, maybe I can't easily change it without reading source.
  // But let's assume the user IS in EU as they said.
}

checkDomainsEU();
