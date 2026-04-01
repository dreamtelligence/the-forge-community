require('dotenv').config({ path: 'the-forge-community/.env.local' });
const { Resend } = require('resend');

async function testResend() {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.error('❌ AUTH_RESEND_KEY is missing in .env.local');
    return;
  }
  
  console.log(`Checking Resend configuration...`);
  console.log(`API Key found: ${apiKey.substring(0, 5)}...`);
  
  const resend = new Resend(apiKey);
  
  // Test 1: Send from the configured domain (info@stakeandscale.de) to a generic email
  console.log('\n--- Test 1: Sending from configured domain (info@stakeandscale.de) to test@example.com ---');
  try {
    const data = await resend.emails.send({
      from: 'STAKE & SCALE <info@stakeandscale.de>',
      to: 'test@example.com',
      subject: 'Resend Configuration Test',
      html: '<strong>Testing Resend Configuration</strong>',
    });
    
    if (data.error) {
       console.error('❌ Test 1 Failed:', data.error);
    } else {
       console.log('✅ Test 1 Success:', data);
    }
  } catch (error) {
    console.error('❌ Test 1 Threw Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }

  // Test 2: Send from the default testing domain (onboarding@resend.dev) to a generic email
  // This usually works if the API key is valid, but only to the verified email if in sandbox.
  console.log('\n--- Test 2: Sending from default testing domain (onboarding@resend.dev) to test@example.com ---');
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'test@example.com',
      subject: 'Resend Fallback Test',
      html: '<strong>Testing Resend Fallback</strong>',
    });

     if (data.error) {
       console.error('❌ Test 2 Failed:', data.error);
    } else {
       console.log('✅ Test 2 Success:', data);
    }
  } catch (error) {
    console.error('❌ Test 2 Threw Error:', error.message);
  }
}

testResend();
