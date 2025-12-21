import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // Your email
        pass: process.env.SMTP_PASS, // Your email password or app password
    },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ Email transporter verification failed:', error.message);
        console.error('Check your SMTP configuration in .env file');
        console.error('SMTP_HOST:', process.env.SMTP_HOST || 'not set');
        console.error('SMTP_PORT:', process.env.SMTP_PORT || 'not set');
        console.error('SMTP_USER:', process.env.SMTP_USER || 'not set');
        console.error('SMTP_PASS:', process.env.SMTP_PASS ? '***set***' : 'not set');
    } else {
        console.log('✅ Email transporter is ready to send emails');
    }
});

/**
 * Send email verification email
 * @param {string} email - Recipient email address
 * @param {string} verificationToken - Email verification token
 * @param {string} username - Username of the user
 */
export async function sendVerificationEmail(email, verificationToken, username) {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email Address - Nexus Medwell',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Nexus Medwell!</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${username},</p>
                        <p>Thank you for registering with Nexus Medwell. Please verify your email address to complete your registration.</p>
                        <p>Click the button below to verify your email:</p>
                        <a href="${verificationLink}" class="button">Verify Email Address</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #666;">${verificationLink}</p>
                        <p><strong>This link will expire in 24 hours.</strong></p>
                        <p>If you didn't create an account with Nexus Medwell, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Nexus Medwell. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Welcome to Nexus Medwell!
            
            Hello ${username},
            
            Thank you for registering with Nexus Medwell. Please verify your email address by clicking the link below:
            
            ${verificationLink}
            
            This link will expire in 24 hours.
            
            If you didn't create an account with Nexus Medwell, please ignore this email.
        `
    };

    try {
        // Check if SMTP credentials are configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('❌ SMTP credentials not configured in .env file');
            return { 
                success: false, 
                error: 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env file' 
            };
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent successfully:', info.messageId);
        console.log('   To:', email);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending verification email:');
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('   To:', email);
        
        // Provide helpful error messages
        let errorMessage = error.message;
        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Check your SMTP_USER and SMTP_PASS in .env file. For Gmail, make sure you\'re using an App Password.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection failed. Check your SMTP_HOST and SMTP_PORT, and ensure your firewall allows SMTP connections.';
        }
        
        return { success: false, error: errorMessage, details: error.code };
    }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 */
export async function sendPasswordResetEmail(email, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your Password - Nexus Medwell',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>You requested to reset your password for your Nexus Medwell account.</p>
                        <p>Click the button below to reset your password:</p>
                        <a href="${resetLink}" class="button">Reset Password</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #666;">${resetLink}</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Nexus Medwell. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        // Check if SMTP credentials are configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('❌ SMTP credentials not configured in .env file');
            return { 
                success: false, 
                error: 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env file' 
            };
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent successfully:', info.messageId);
        console.log('   To:', email);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending password reset email:');
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('   To:', email);
        
        // Provide helpful error messages
        let errorMessage = error.message;
        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Check your SMTP_USER and SMTP_PASS in .env file. For Gmail, make sure you\'re using an App Password.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection failed. Check your SMTP_HOST and SMTP_PORT, and ensure your firewall allows SMTP connections.';
        }
        
        return { success: false, error: errorMessage, details: error.code };
    }
}


