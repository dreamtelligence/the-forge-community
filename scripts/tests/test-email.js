const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const toEmail = process.env.TEST_EMAIL_TO || 'test@example.com';
const fromEmail = process.env.TEST_EMAIL_FROM || 'THE FORGE <onboarding@resend.dev>';

if (!apiKey) {
  console.error('Missing RESEND_API_KEY environment variable.');
  process.exit(1);
}

const resend = new Resend(apiKey);

async function sendTest() {
  try {
    console.log('Sending test email...');
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Resend Debug Test',
      html: '<strong>It works!</strong>',
    });

    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

sendTest();
