const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Setting up transporter for smtp.office365.com:587...');
  
  // Using the credentials from the user's .env configuration
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 465,
    secure: true,
    auth: {
      user: 'ittldigitalization@indo-tech.com',
      pass: 'Ittl@123'
    },
    tls: {
      rejectUnauthorized: false
    },
    family: 4,
    debug: true,
    logger: true
  });

  try {
    console.log('Attempting to verify connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully!');

    console.log('Attempting to send a test email...');
    const info = await transporter.sendMail({
      from: '"RTCC Test" <ittldigitalization@indo-tech.com>',
      to: 'ittldigitalization@indo-tech.com', // Sending to self for test
      subject: 'Test Email from Node.js',
      text: 'If you receive this, the SMTP configuration is working!'
    });
    
    console.log('✅ Email sent successfully:', info.messageId);
  } catch (err) {
    console.error('❌ Error testing email:');
    console.error(err);
  }
}

testEmail();
