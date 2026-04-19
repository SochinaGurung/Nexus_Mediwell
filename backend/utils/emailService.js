// emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

function createTransporter() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
        console.error(' SMTP credentials not configured!');
        console.error('   Please set SMTP_USER and SMTP_PASS in your .env file');
        return null;
    }

    return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, 
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });
}

const transporter = createTransporter();
if (transporter) {
    transporter.verify((error, success) => {
        if (error) {
            console.error(' Email transporter verification failed:', error.message);
        } else {
            console.log('Email transporter is ready to send emails');
        }
    });
} else {
    console.warn('  Email functionality disabled - SMTP credentials not configured');
}


async function sendAppointmentEmail(email, type, appointmentData) {
    if (!transporter) {
        return { success: false, error: 'SMTP transporter not configured' };
    }

    let subject, htmlContent, textContent;

    const { patientName, doctorName, appointmentDate, appointmentTime, reason, cancelledBy, oldDate, oldTime, newDate, newTime, rescheduledBy } = appointmentData;

    const formattedDate = appointmentDate ? new Date(appointmentDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : null;
    const formattedOldDate = oldDate ? new Date(oldDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : null;
    const formattedNewDate = newDate ? new Date(newDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : null;

    switch(type) {
        case 'confirmation':
            subject = 'Appointment Confirmed - Nexus Medwell';
            htmlContent = `
                <p>Hello ${patientName},</p>
                <p>Your appointment has been confirmed.</p>
                <p><strong>Doctor:</strong> ${doctorName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${appointmentTime}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>Thank you!</p>
            `;
            textContent = `Hello ${patientName}, Your appointment has been confirmed. Doctor: ${doctorName}, Date: ${formattedDate}, Time: ${appointmentTime}${reason ? `, Reason: ${reason}` : ''}`;
            break;

        case 'cancellation':
            subject = 'Appointment Cancelled - Nexus Medwell';
            htmlContent = `
                <p>Hello ${patientName},</p>
                <p>Your appointment has been cancelled.</p>
                <p><strong>Doctor:</strong> ${doctorName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${appointmentTime}</p>
                <p><strong>Cancelled by:</strong> ${cancelledBy}</p>
            `;
            textContent = `Hello ${patientName}, Your appointment has been cancelled. Doctor: ${doctorName}, Date: ${formattedDate}, Time: ${appointmentTime}, Cancelled by: ${cancelledBy}`;
            break;

        case 'reschedule':
            subject = 'Appointment Rescheduled - Nexus Medwell';
            htmlContent = `
                <p>Hello ${patientName},</p>
                <p>Your appointment has been rescheduled.</p>
                <p><strong>Doctor:</strong> ${doctorName}</p>
                <p><strong>Previous Date & Time:</strong> ${formattedOldDate} at ${oldTime}</p>
                <p><strong>New Date & Time:</strong> ${formattedNewDate} at ${newTime}</p>
                <p><strong>Rescheduled by:</strong> ${rescheduledBy}</p>
            `;
            textContent = `Hello ${patientName}, Your appointment has been rescheduled. Doctor: ${doctorName}, Previous Date & Time: ${formattedOldDate} at ${oldTime}, New Date & Time: ${formattedNewDate} at ${newTime}, Rescheduled by: ${rescheduledBy}`;
            break;

        case 'dayBeforeReminder':
            subject = 'Reminder: Your appointment is tomorrow - Nexus Medwell';
            htmlContent = `
                <p>Hello ${patientName},</p>
                <p>This is a friendly reminder that you have an appointment <strong>tomorrow</strong>.</p>
                <p><strong>Doctor:</strong> ${doctorName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${appointmentTime}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>We look forward to seeing you. If you need to reschedule or cancel, please do so through your Nexus Medwell account.</p>
                <p>Thank you,<br/>Nexus Medwell</p>
            `;
            textContent = `Hello ${patientName}, Reminder: your appointment is tomorrow. Doctor: ${doctorName}, Date: ${formattedDate}, Time: ${appointmentTime}${reason ? `, Reason: ${reason}` : ''}. — Nexus Medwell`;
            break;

        default:
            return { success: false, error: 'Invalid email type' };
    }

    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html: htmlContent,
        text: textContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(` ${type} email sent to ${email}, messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(` Error sending ${type} email to ${email}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Wrappers for old function names
 */
export async function sendAppointmentConfirmationEmail(email, data) {
    return sendAppointmentEmail(email, 'confirmation', data);
}

export async function sendAppointmentCancellationEmail(email, data) {
    return sendAppointmentEmail(email, 'cancellation', data);
}

export async function sendAppointmentRescheduledEmail(email, data) {
    return sendAppointmentEmail(email, 'reschedule', data);
}

export async function sendAppointmentDayBeforeReminderEmail(email, data) {
    return sendAppointmentEmail(email, 'dayBeforeReminder', data);
}

export async function sendVerificationEmail(email, token, username) {
    if (!transporter) {
        return { 
            success: false, 
            error: 'SMTP transporter not configured',
            userMessage: 'Email service is not configured. Please contact support.'
        };
    }

    // Validate email format more strictly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            success: false,
            error: 'Invalid email format',
            userMessage: 'Invalid email address format. Please check your email address.'
        };
    }

    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email Address - Nexus Medwell',
        html: `<p>Hello ${username},</p><p> Welcome to Nexus Mediwell</p><p>Verify your email: <a href="${verificationLink}">Click here</a></p><p>We wish you good health</p>`,
        text: `Hello ${username},Welcome to Nexus Mediwell, Verify your email: ${verificationLink}, We wish you good health`,
        // Enable validation and reject invalid addresses immediately
        validate: true,
        // Reject invalid addresses
        rejectUnauthorized: false 
    };

    try {
        // Use sendMail with callback to catch immediate rejections
        const info = await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(info);
                }
            });
        });
        
        console.log(` Verification email sent to ${email}, messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(` Error sending verification email to ${email}:`, error.message);
        console.error(` Error code: ${error.code}, Response code: ${error.responseCode}`);
        console.error(` Full error:`, error);
        
        // Provide user-friendly error messages
        let userMessage = 'Failed to send verification email.';
        const errorCode = error.code || '';
        const responseCode = error.responseCode || '';
        const errorMessage = error.message || '';
        
        // Check for invalid email address errors (these should block registration)
        if (responseCode === 550 || errorMessage.includes('550') || 
            errorMessage.includes('User unknown') || errorMessage.includes('Mailbox') ||
            errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
            userMessage = 'Email address not found or invalid. Please check your email address.';
        } else if (responseCode === 553 || errorMessage.includes('553') ||
                   errorMessage.includes('Invalid address') || errorMessage.includes('invalid') ||
                   errorMessage.includes('Address rejected') || errorMessage.includes('rejected')) {
            userMessage = 'Invalid email address format. Please check your email address.';
        } else if (errorMessage.includes('Invalid recipient') || errorMessage.includes('recipient')) {
            userMessage = 'Invalid email address. Please check your email address and try again.';
        } else if (errorCode === 'EAUTH' || errorCode === 'EENVELOPE') {
            userMessage = 'Email service configuration error. Please contact support.';
        } else if (errorCode === 'ECONNECTION' || errorCode === 'ETIMEDOUT') {
            userMessage = 'Unable to connect to email server. Please try again later.';
        }
        
        return { success: false, error: error.message, userMessage };
    }
}

export async function sendPasswordResetEmail(email, token) {
    if (!transporter) return { success: false, error: 'SMTP transporter not configured' };

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const mailOptions = {
        from: `"Nexus Medwell" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your Password - Nexus Medwell',
        html: `<p>Reset your password: <a href="${resetLink}">Click here</a></p>`,
        text: `Reset your password: ${resetLink}`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}, messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(` Error sending password reset email to ${email}:`, error.message);
        
        // Provide user-friendly error messages
        let userMessage = 'Failed to send password reset email.';
        if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
            userMessage = 'Email service configuration error. Please contact support.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            userMessage = 'Unable to connect to email server. Please try again later.';
        } else if (error.responseCode === 550 || error.message.includes('550')) {
            userMessage = 'Email address not found or invalid. Please check your email address.';
        } else if (error.responseCode === 553 || error.message.includes('553')) {
            userMessage = 'Invalid email address format. Please check your email address.';
        } else if (error.message.includes('Invalid recipient') || error.message.includes('recipient')) {
            userMessage = 'Invalid email address. Please check your email address and try again.';
        }
        
        return { success: false, error: error.message, userMessage };
    }
}
