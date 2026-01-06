# Email Setup Guide for Nexus Medwell

This guide will help you configure email functionality for user verification and password reset.

## Quick Setup Steps

### 1. Create `.env` File

Copy `.env.example` to `.env` in the `backend` folder:
```bash
cp .env.example .env
```

### 2. Configure Email Settings

#### Option A: Using Gmail (Recommended for Development)

1. **Enable 2-Step Verification**
   - Go to your Google Account: https://myaccount.google.com/
   - Navigate to Security → 2-Step Verification
   - Enable it if not already enabled

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Nexus Medwell" as the name
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Update `.env` file**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

#### Option B: Using Outlook/Hotmail

1. **Update `.env` file**
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-outlook-password
   ```

#### Option C: Using Other Email Providers

Check your email provider's SMTP settings:
- **Yahoo**: smtp.mail.yahoo.com:587
- **SendGrid**: smtp.sendgrid.net:587 (requires API key)
- **Mailgun**: smtp.mailgun.org:587
- **AWS SES**: Check AWS documentation

### 3. Test Email Configuration

You can test if emails are working by:

1. **Register a new user** via Postman:
   ```
   POST http://localhost:3000/api/auth/register
   {
     "username": "testuser",
     "email": "your-real-email@example.com",
     "password": "test123"
   }
   ```

2. **Check your email inbox** for the verification email

3. **Check server console** for any email errors

## Troubleshooting

### Email Not Sending?

1. **Check server console** for error messages
2. **Verify SMTP credentials** are correct
3. **Check firewall/antivirus** isn't blocking SMTP
4. **For Gmail**: Make sure you're using App Password, not regular password
5. **Check spam folder** - emails might be filtered

### Common Errors

**Error: "Invalid login"**
- Wrong email or password
- For Gmail: Make sure you're using App Password, not regular password

**Error: "Connection timeout"**
- Check SMTP_HOST and SMTP_PORT
- Verify firewall settings
- Try different SMTP port (465 for SSL, 587 for TLS)

**Error: "Authentication failed"**
- Verify SMTP_USER and SMTP_PASS
- For Gmail: Regenerate App Password
- Check if 2-Step Verification is enabled (for Gmail)

## Security Notes

⚠️ **Important**: Never commit your `.env` file to version control!

- Add `.env` to `.gitignore`
- Use `.env.example` as a template
- In production, use environment variables or secure secret management

## Production Recommendations

For production, consider using:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (very cheap, scalable)
- **Postmark** (great deliverability)

These services provide:
- Better deliverability
- Email analytics
- Higher sending limits
- Better spam handling

## Testing Without Real Email (Development Only)

If you want to test without sending real emails, you can:
1. Use a service like **Mailtrap** (https://mailtrap.io) - free tier available
2. Use **Ethereal Email** (https://ethereal.email) - generates test accounts
3. Check server logs for email content (currently emails are sent, but you can add logging)

## Environment Variables Required

Add these to your `.env` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

## Email Features Implemented

✅ **Email Verification**
- Users receive verification email on registration
- Email verification required before login
- Resend verification email endpoint
- Verification tokens expire after 24 hours

✅ **Appointment Confirmation Emails**
- Patients receive confirmation email when booking appointments
- Includes appointment details (doctor, date, time, reason)

✅ **Email Templates**
- HTML email templates with styling
- Plain text fallback for email clients
- Professional branding

## API Endpoints

### Email Verification
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email

### Example: Verify Email
```json
POST /api/auth/verify-email
{
  "token": "verification-token-from-email"
}
```

### Example: Resend Verification
```json
POST /api/auth/resend-verification
{
  "email": "user@example.com"
}
```

## Next Steps

1. ✅ Configure `.env` with your email settings
2. ✅ Test registration to receive verification email
3. ✅ Test email verification
4. ✅ Test appointment booking to receive confirmation email
5. ✅ Deploy and configure production email service












