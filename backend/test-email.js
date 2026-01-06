// Quick email test script
// Run with: node test-email.js

import dotenv from 'dotenv';
import { sendVerificationEmail } from './utils/emailService.js';

dotenv.config();

async function testEmail() {
    console.log('🧪 Testing email configuration...\n');
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('  SMTP_HOST:', process.env.SMTP_HOST || 'not set (will use default: smtp.gmail.com)');
    console.log('  SMTP_PORT:', process.env.SMTP_PORT || 'not set (will use default: 587)');
    console.log('  SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
    console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '***set***' : '❌ NOT SET');
    console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'not set (will use default: http://localhost:5173)');
    console.log('');

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ SMTP credentials not configured!');
        console.error('   Please set SMTP_USER and SMTP_PASS in your .env file');
        console.error('   See EMAIL_SETUP_GUIDE.md for instructions');
        process.exit(1);
    }

    // Test email
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    const testToken = 'test-token-12345';
    const testUsername = 'TestUser';

    console.log(`📧 Attempting to send test email to: ${testEmail}\n`);

    const result = await sendVerificationEmail(testEmail, testToken, testUsername);

    if (result.success) {
        console.log('\n✅ Email test successful!');
        console.log('   Check your inbox (and spam folder) for the test email');
    } else {
        console.log('\n❌ Email test failed!');
        console.log('   Error:', result.error);
        if (result.details) {
            console.log('   Error code:', result.details);
        }
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Check your SMTP credentials in .env file');
        console.log('   2. For Gmail: Make sure you\'re using an App Password');
        console.log('   3. Check firewall/antivirus settings');
        console.log('   4. See EMAIL_SETUP_GUIDE.md for more help');
    }
}

testEmail().catch(console.error);

