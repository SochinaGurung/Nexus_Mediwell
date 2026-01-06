import nodemailer from 'nodemailer';

// Function to create transporter with current environment variables
function createTransporter() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
        console.error('❌ SMTP credentials not configured!');
        console.error('   Please set SMTP_USER and SMTP_PASS in your .env file');
        return null;
    }

    return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });
}

// Create transporter
let transporter = createTransporter();

// Verify transporter configuration on startup
if (transporter) {
    transporter.verify(function (error, success) {
        if (error) {
            console.error('❌ Email transporter verification failed:', error.message);
            console.error('   Error code:', error.code);
            console.error('   Check your SMTP configuration in .env file');
            console.error('   SMTP_HOST:', process.env.SMTP_HOST || 'not set (default: smtp.gmail.com)');
            console.error('   SMTP_PORT:', process.env.SMTP_PORT || 'not set (default: 587)');
            console.error('   SMTP_USER:', process.env.SMTP_USER || 'not set');
            console.error('   SMTP_PASS:', process.env.SMTP_PASS ? '***set***' : 'not set');
            
            if (error.code === 'EAUTH') {
                console.error('   💡 For Gmail: Make sure you\'re using an App Password, not your regular password');
                console.error('   💡 Generate App Password: https://myaccount.google.com/apppasswords');
            }
        } else {
            console.log('✅ Email transporter is ready to send emails');
            console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
            console.log('   SMTP_PORT:', process.env.SMTP_PORT || '587');
            console.log('   SMTP_USER:', process.env.SMTP_USER);
        }
    });
} else {
    console.warn('⚠️  Email functionality disabled - SMTP credentials not configured');
}

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
            console.error('   Attempting to send email to:', email);
            return { 
                success: false, 
                error: 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env file' 
            };
        }

        // Recreate transporter to ensure we have latest credentials
        const currentTransporter = createTransporter();
        if (!currentTransporter) {
            return {
                success: false,
                error: 'Failed to create email transporter. Check SMTP configuration.'
            };
        }

        console.log('📧 Attempting to send verification email...');
        console.log('   To:', email);
        console.log('   From:', process.env.SMTP_USER);

        const info = await currentTransporter.sendMail(mailOptions);
        console.log('✅ Verification email sent successfully!');
        console.log('   Message ID:', info.messageId);
        console.log('   To:', email);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending verification email:');
        console.error('   To:', email);
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('   Full error:', error);
        
        // Provide helpful error messages
        let errorMessage = error.message;
        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Check your SMTP_USER and SMTP_PASS in .env file. For Gmail, make sure you\'re using an App Password (not your regular password).';
            console.error('   💡 For Gmail: Generate App Password at https://myaccount.google.com/apppasswords');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection failed. Check your SMTP_HOST and SMTP_PORT, and ensure your firewall allows SMTP connections.';
        } else if (error.code === 'EENVELOPE') {
            errorMessage = 'Invalid email address. Please check the recipient email.';
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

        // Recreate transporter to ensure we have latest credentials
        const currentTransporter = createTransporter();
        if (!currentTransporter) {
            return {
                success: false,
                error: 'Failed to create email transporter. Check SMTP configuration.'
            };
        }

        const info = await currentTransporter.sendMail(mailOptions);
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

/**
 * Send appointment confirmation email
 * @param {string} email - Recipient email address
 * @param {object} appointmentData - Appointment details
 */
export async function sendAppointmentConfirmationEmail(email, appointmentData) {
    const { patientName, doctorName, appointmentDate, appointmentTime, reason } = appointmentData;
    
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Appointment Confirmed - Nexus Medwell',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Appointment Confirmed</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${patientName},</p>
                        <p>Your appointment has been successfully booked!</p>
                        <div class="info-box">
                            <p><strong>Doctor:</strong> ${doctorName}</p>
                            <p><strong>Date:</strong> ${formattedDate}</p>
                            <p><strong>Time:</strong> ${appointmentTime}</p>
                            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                        </div>
                        <p>Please arrive 10 minutes before your scheduled time.</p>
                        <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Nexus Medwell. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Appointment Confirmed - Nexus Medwell
            
            Hello ${patientName},
            
            Your appointment has been successfully booked!
            
            Doctor: ${doctorName}
            Date: ${formattedDate}
            Time: ${appointmentTime}
            ${reason ? `Reason: ${reason}` : ''}
            
            Please arrive 10 minutes before your scheduled time.
            
            If you need to reschedule or cancel, please contact us at least 24 hours in advance.
        `
    };

    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('❌ SMTP credentials not configured');
            return { 
                success: false, 
                error: 'SMTP credentials not configured' 
            };
        }

        // Recreate transporter to ensure we have latest credentials
        const currentTransporter = createTransporter();
        if (!currentTransporter) {
            return {
                success: false,
                error: 'Failed to create email transporter. Check SMTP configuration.'
            };
        }

        console.log('📧 Attempting to send appointment confirmation email...');
        console.log('   To:', email);
        
        const info = await currentTransporter.sendMail(mailOptions);
        console.log('✅ Appointment confirmation email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending appointment confirmation email:');
        console.error('   To:', email);
        console.error('   Error:', error.message);
        console.error('   Error code:', error.code);
        return { success: false, error: error.message, details: error.code };
    }
}

/**
 * Send appointment cancellation email
 * @param {string} email - Recipient email address
 * @param {object} appointmentData - Appointment details
 */
export async function sendAppointmentCancellationEmail(email, appointmentData) {
    const { patientName, doctorName, appointmentDate, appointmentTime, cancelledBy } = appointmentData;
    
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Appointment Cancelled - Nexus Medwell',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Appointment Cancelled</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${patientName},</p>
                        <p>Your appointment has been cancelled.</p>
                        <div class="info-box">
                            <p><strong>Doctor:</strong> ${doctorName}</p>
                            <p><strong>Date:</strong> ${formattedDate}</p>
                            <p><strong>Time:</strong> ${appointmentTime}</p>
                            <p><strong>Cancelled by:</strong> ${cancelledBy}</p>
                        </div>
                        <p>If you need to reschedule, please book a new appointment through the portal.</p>
                        <p>If you have any questions, please contact us.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Nexus Medwell. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Appointment Cancelled - Nexus Medwell
            
            Hello ${patientName},
            
            Your appointment has been cancelled.
            
            Doctor: ${doctorName}
            Date: ${formattedDate}
            Time: ${appointmentTime}
            Cancelled by: ${cancelledBy}
            
            If you need to reschedule, please book a new appointment through the portal.
        `
    };

    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('❌ SMTP credentials not configured');
            return { 
                success: false, 
                error: 'SMTP credentials not configured' 
            };
        }

        const currentTransporter = createTransporter();
        if (!currentTransporter) {
            return {
                success: false,
                error: 'Failed to create email transporter. Check SMTP configuration.'
            };
        }

        console.log('📧 Attempting to send appointment cancellation email...');
        console.log('   To:', email);
        
        const info = await currentTransporter.sendMail(mailOptions);
        console.log('✅ Appointment cancellation email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending appointment cancellation email:');
        console.error('   To:', email);
        console.error('   Error:', error.message);
        console.error('   Error code:', error.code);
        return { success: false, error: error.message, details: error.code };
    }
}

/**
 * Send appointment rescheduled email
 * @param {string} email - Recipient email address
 * @param {object} appointmentData - Appointment details
 */
export async function sendAppointmentRescheduledEmail(email, appointmentData) {
    const { patientName, doctorName, oldDate, oldTime, newDate, newTime, rescheduledBy } = appointmentData;
    
    const formattedOldDate = new Date(oldDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const formattedNewDate = new Date(newDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Appointment Rescheduled - Nexus Medwell',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF9800; }
                    .old-info { background-color: #ffebee; padding: 10px; margin: 10px 0; }
                    .new-info { background-color: #e8f5e9; padding: 10px; margin: 10px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Appointment Rescheduled</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${patientName},</p>
                        <p>Your appointment has been rescheduled.</p>
                        <div class="info-box">
                            <p><strong>Doctor:</strong> ${doctorName}</p>
                            <div class="old-info">
                                <p><strong>Previous Date & Time:</strong></p>
                                <p>${formattedOldDate} at ${oldTime}</p>
                            </div>
                            <div class="new-info">
                                <p><strong>New Date & Time:</strong></p>
                                <p>${formattedNewDate} at ${newTime}</p>
                            </div>
                            <p><strong>Rescheduled by:</strong> ${rescheduledBy}</p>
                        </div>
                        <p>Please arrive 10 minutes before your new scheduled time.</p>
                        <p>If you need to make further changes, please contact us.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Nexus Medwell. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Appointment Rescheduled - Nexus Medwell
            
            Hello ${patientName},
            
            Your appointment has been rescheduled.
            
            Doctor: ${doctorName}
            
            Previous Date & Time:
            ${formattedOldDate} at ${oldTime}
            
            New Date & Time:
            ${formattedNewDate} at ${newTime}
            
            Rescheduled by: ${rescheduledBy}
            
            Please arrive 10 minutes before your new scheduled time.
        `
    };

    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('❌ SMTP credentials not configured');
            return { 
                success: false, 
                error: 'SMTP credentials not configured' 
            };
        }

        const currentTransporter = createTransporter();
        if (!currentTransporter) {
            return {
                success: false,
                error: 'Failed to create email transporter. Check SMTP configuration.'
            };
        }

        console.log('📧 Attempting to send appointment rescheduled email...');
        console.log('   To:', email);
        
        const info = await currentTransporter.sendMail(mailOptions);
        console.log('✅ Appointment rescheduled email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending appointment rescheduled email:');
        console.error('   To:', email);
        console.error('   Error:', error.message);
        console.error('   Error code:', error.code);
        return { success: false, error: error.message, details: error.code };
    }
}

