# Resend Contact Form Integration Guide

## 📧 Overview

Your CryptoLoveYou.com contact form is now fully integrated with Resend email service using the verified `@cryptoloveyou.io` domain.

## ✅ What's Configured

### Email Addresses (Verified in Resend)
- `admin@cryptoloveyou.com`
- `affiliate@cryptoloveyou.com`
- `contact@cryptoloveyou.com` ← **Receives contact form notifications**
- `info@cryptoloveyou.com`
- `reply@cryptoloveyou.io` ← **Sends emails from**

### Environment Variables (.env)
```bash
RESEND_API_KEY=re_Wjb1bpu6_CNuDcGLNMKwKpTV3P82ThE7W
RESEND_NOTIFY_TO=contact@cryptoloveyou.com
RESEND_FROM=Crypto Love You <reply@cryptoloveyou.io>
RESEND_REPLY_TO=contact@cryptoloveyou.com
RESEND_AUTO_REPLY_SUBJECT=We received your message — Crypto Love You
```

## 🔄 How It Works

When a user submits the contact form at `/contact`:

1. **Form Submission** → Netlify Function (`/.netlify/functions/submit-contact`)
2. **Data Saved** → Supabase database
3. **📧 Notification Email** → Sent to `contact@cryptoloveyou.com` (site owner)
   - From: `reply@cryptoloveyou.io`
   - Contains: User's name, email, message
   - Reply-To: User's email (so you can reply directly)
4. **📧 Auto-Reply Email** → Sent to the user who submitted the form
   - From: `reply@cryptoloveyou.io`
   - Subject: "We received your message — Crypto Love You"
   - Confirms their message was received
5. **🔄 HubSpot Sync** → Contact synced to HubSpot (if configured)

## 🧪 Testing the Integration

### Method 1: Browser Test Page (Recommended)

1. Start Netlify Dev server:
   ```bash
   netlify dev
   ```

2. Open the test page:
   ```
   http://localhost:8888/test-contact-form.html
   ```

3. Fill out the form with:
   - Your name
   - **Your real email address** (you'll receive auto-reply here)
   - A test message

4. Click "Send Test Message"

5. **Check Results:**
   - ✅ Success message appears on the page
   - 📧 Check `contact@cryptoloveyou.com` inbox for notification
   - 📧 Check your test email inbox for auto-reply
   - 💾 Verify contact saved in Supabase dashboard

### Method 2: Command Line Test

```bash
node scripts/test-resend.cjs your-email@example.com
```

### Method 3: Live Contact Page

Visit your deployed site's contact page:
```
https://cryptoloveyou.com/contact
```

## 📋 Email Templates

### Notification Email (to site owner)
```
From: reply@cryptoloveyou.io
To: contact@cryptoloveyou.com
Reply-To: user@example.com
Subject: Contact form: John Doe

Name: John Doe
Email: user@example.com
Source: contact_page

Message:
[User's message here]
```

### Auto-Reply Email (to user)
```
From: reply@cryptoloveyou.io
To: user@example.com
Reply-To: contact@cryptoloveyou.com
Subject: We received your message — Crypto Love You

Hi John,

Thanks for contacting Crypto Love You. We have received your message and will get back to you as soon as we can.

— Crypto Love You
```

## 🔧 Troubleshooting

### Emails Not Arriving?

1. **Check Spam Folders** - Resend emails may land in spam initially
2. **Verify Domain** - Ensure `cryptoloveyou.io` is verified in Resend dashboard
3. **Check Resend Dashboard** - View email logs at https://resend.com/logs
4. **Environment Variables** - Verify `.env` has correct API key and email addresses
5. **Netlify Logs** - Check function logs for errors

### Common Issues

**"Chat is temporarily unavailable"**
- Resend API key is missing or invalid
- Check `RESEND_API_KEY` in `.env`

**"Validation failed"**
- Email format is invalid
- Name or message is empty
- Check form fields are filled correctly

**"Too many requests"**
- Rate limit exceeded (5 requests per minute per email)
- Wait 60 seconds and try again

## 📊 Monitoring

### Resend Dashboard
- View all sent emails: https://resend.com/emails
- Check API usage: https://resend.com/settings/api-keys
- Domain settings: https://resend.com/domains

### Supabase Dashboard
- View contact submissions: https://supabase.com/dashboard/project/kibgrvomourbyyepidli/editor
- Table: `contacts`

## 🚀 Deployment

When deploying to Netlify, ensure these environment variables are set:

```bash
RESEND_API_KEY=re_Wjb1bpu6_CNuDcGLNMKwKpTV3P82ThE7W
RESEND_NOTIFY_TO=contact@cryptoloveyou.com
RESEND_FROM=Crypto Love You <reply@cryptoloveyou.io>
RESEND_REPLY_TO=contact@cryptoloveyou.com
SUPABASE_URL=https://kibgrvomourbyyepidli.supabase.co
SUPABASE_SERVICE_KEY=[your_service_key]
```

**Important:** Don't commit `.env` file to git! It's already in `.gitignore`.

## 📝 Configuration Options

### Disable Auto-Reply
Add to `.env`:
```bash
RESEND_AUTO_REPLY=false
```

### Change Auto-Reply Subject
```bash
RESEND_AUTO_REPLY_SUBJECT=Thank you for contacting us!
```

### Add Multiple Notification Recipients
```bash
RESEND_NOTIFY_TO=contact@cryptoloveyou.com,admin@cryptoloveyou.com,info@cryptoloveyou.com
```

## 🔒 Security

- ✅ API keys are in `.env` (not committed to git)
- ✅ Rate limiting enabled (5 requests/minute per email)
- ✅ Input sanitization and validation
- ✅ CORS headers configured
- ✅ Email addresses must be from verified domain

## 📞 Support

- **Resend Documentation:** https://resend.com/docs
- **Resend Support:** support@resend.com
- **Test Files Created:**
  - `test-contact-form.html` - Browser-based test
  - `scripts/test-resend.cjs` - Command-line test

---

**Last Updated:** April 5, 2026
**Domain:** cryptoloveyou.io
**Verified Emails:** admin@, affiliate@, contact@, info@, reply@
