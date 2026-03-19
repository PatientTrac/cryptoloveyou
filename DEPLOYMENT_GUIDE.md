# Deployment Guide - Crypto Love You

Complete step-by-step guide to deploy your site to production.

## 📋 Pre-Deployment Checklist

- [ ] Supabase project created
- [ ] HubSpot account with API key
- [ ] Netlify account created
- [ ] Git repository initialized
- [ ] All code committed to Git

## 🗄️ Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in project details:
   - **Name:** crypto-love-you
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 1.2 Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into SQL Editor
5. Click **"Run"**
6. Verify success (should see "Success. No rows returned")

### 1.3 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **service_role key** (under "Project API keys")

⚠️ **Important:** Never use `anon` key in functions - always use `service_role`

### 1.4 Verify Tables Created

1. Go to **Table Editor**
2. You should see these tables:
   - `contacts`
   - `leads`
   - `affiliate_tracking`
   - `affiliate_clicks`

## 🔗 Step 2: Set Up HubSpot Integration

### 2.1 Create HubSpot Private App

1. Log into [HubSpot](https://app.hubspot.com)
2. Go to **Settings** → **Integrations** → **Private Apps**
3. Click **"Create a private app"**
4. Fill in details:
   - **Name:** Crypto Love You Integration
   - **Description:** Static site contact form integration

### 2.2 Configure Scopes

Under **Scopes**, enable these permissions:

**CRM:**
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.objects.deals.read`
- `crm.objects.deals.write`

**Other:**
- `crm.schemas.contacts.read`

### 2.3 Get HubSpot API Key

1. Click **"Create app"**
2. Copy the **Access Token** (this is your `HUBSPOT_API_KEY`)
3. Save it securely - you won't see it again!

### 2.4 Verify Custom Properties (Optional)

Go to **Settings** → **Properties** → **Contact Properties**

Ensure these properties exist (create if missing):
- `contact_source` (Single-line text)
- `message` (Multi-line text)

## 🚀 Step 3: Deploy to Netlify

### Option A: Deploy via Git (Recommended)

#### 3.1 Push Code to GitHub/GitLab

```bash
# Create a new repository on GitHub first, then:

git add .
git commit -m "Initial commit: Phase 1 implementation"
git remote add origin https://github.com/yourusername/crypto-love-you.git
git push -u origin main
```

#### 3.2 Connect to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Configure build settings:
   - **Build command:** `echo 'No build needed'`
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
6. Click **"Deploy site"**

### Option B: Manual Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## 🔐 Step 4: Configure Environment Variables

### 4.1 Add Variables in Netlify

1. In Netlify dashboard, go to **Site settings** → **Environment variables**
2. Click **"Add a variable"** and add each of these:

| Key | Value | Notes |
|-----|-------|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase API settings |
| `SUPABASE_SERVICE_KEY` | `eyJhbG...` | From Supabase (service_role) |
| `HUBSPOT_API_KEY` | `pat-na1-...` | From HubSpot Private App |
| `SYNC_API_KEY` | `generate-random-string` | Create a strong random key |

**To generate SYNC_API_KEY:**
```bash
openssl rand -base64 32
```

### 4.2 Redeploy Site

After adding environment variables:
1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**

## ✅ Step 5: Test Everything

### 5.1 Test Contact Form

1. Visit your Netlify site URL
2. Go to `/contact/` page
3. Fill out and submit the form
4. You should see success message

### 5.2 Verify in Supabase

1. Go to Supabase **Table Editor** → `contacts`
2. You should see your test submission
3. Check if `hubspot_contact_id` field is populated (might take a few seconds)

### 5.3 Verify in HubSpot

1. Go to HubSpot **Contacts**
2. Search for your test email
3. You should see the contact with:
   - Name
   - Email
   - Message (in notes or custom property)
   - Contact Source

### 5.4 Test Netlify Function Logs

1. Go to Netlify **Functions** tab
2. Click **"submit-contact"**
3. Click **"Function log"**
4. You should see logs from your test submission

## 🐛 Troubleshooting

### Form submission fails

**Check 1: Network Tab**
- Open browser DevTools → Network
- Submit form again
- Look for `submit-contact` request
- Check status code and response

**Check 2: Function Logs**
- Netlify dashboard → Functions → submit-contact → Function log
- Look for error messages

**Check 3: Environment Variables**
- Verify all env vars are set correctly
- No extra spaces or quotes

### HubSpot contact not created

**Check 1: HubSpot API Key**
```bash
curl https://api.hubapi.com/crm/v3/objects/contacts \
  -H "Authorization: Bearer YOUR_HUBSPOT_API_KEY"
```
Should return contacts list (not 401 error)

**Check 2: Supabase Contact**
- Check if contact was saved to Supabase
- Check if `hubspot_contact_id` field is NULL
- If NULL, HubSpot sync failed

**Check 3: Run Manual Sync**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/hubspot-sync \
  -H "Authorization: Bearer YOUR_SYNC_API_KEY"
```

### Database errors

**Check 1: Service Key**
- Verify you're using `service_role` key (not `anon`)
- Service key should start with `eyJhbG...`

**Check 2: RLS Policies**
- In Supabase, go to **Authentication** → **Policies**
- Verify policies exist for `contacts` table
- Service role should have full access

## 🎯 Post-Deployment Tasks

### Set Up Custom Domain

1. In Netlify, go to **Domain settings**
2. Click **"Add custom domain"**
3. Follow instructions to configure DNS

### Enable HTTPS

Netlify automatically provisions SSL certificates via Let's Encrypt.

### Set Up Monitoring

**Option 1: Netlify Analytics**
- Enable in Netlify dashboard (paid feature)

**Option 2: Google Analytics**
- Add GA4 tracking code to your site

**Option 3: Sentry (Error Tracking)**
```bash
npm install @sentry/node
```

### Schedule HubSpot Sync (Optional)

Use Netlify Scheduled Functions (requires Build Plugin):

1. Create `netlify/functions/scheduled-hubspot-sync.js`:
```javascript
import { schedule } from '@netlify/functions'
import { handler as syncHandler } from './hubspot-sync.js'

export const handler = schedule('0 */6 * * *', async (event) => {
  return syncHandler(event, {})
})
```

2. This will run sync every 6 hours

## 📊 Monitoring & Maintenance

### Daily Checks
- [ ] Check Netlify function logs for errors
- [ ] Verify contact forms are working
- [ ] Check Supabase storage usage

### Weekly Tasks
- [ ] Review HubSpot sync status
- [ ] Check for failed contact submissions
- [ ] Review affiliate tracking data (Phase 3)

### Monthly Tasks
- [ ] Review and optimize database indexes
- [ ] Check Netlify bandwidth usage
- [ ] Update dependencies (`npm update`)

## 🔄 Making Updates

### Code Changes

```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main
```

Netlify will automatically deploy on push.

### Database Schema Changes

1. Create new migration file:
   ```
   supabase/migrations/002_your_changes.sql
   ```

2. Run in Supabase SQL Editor

3. Update code if needed

### Environment Variable Changes

1. Update in Netlify dashboard
2. Trigger redeploy

## 🆘 Getting Help

### Check Logs

**Netlify Function Logs:**
- Netlify Dashboard → Functions → [function name] → Function log

**Supabase Logs:**
- Supabase Dashboard → Logs → Database

**Browser Console:**
- F12 → Console tab

### Common Error Messages

| Error | Solution |
|-------|----------|
| `Missing Supabase environment variables` | Check env vars in Netlify |
| `Failed to insert contact` | Check Supabase RLS policies |
| `Failed to sync contact to HubSpot` | Verify HubSpot API key |
| `429 Too Many Requests` | Rate limit hit, wait 1 minute |

## ✅ Deployment Complete!

Your site should now be live with:
- ✅ Working contact form
- ✅ Supabase database integration
- ✅ HubSpot CRM sync
- ✅ Secure serverless functions
- ✅ Rate limiting & spam protection

**Next:** Proceed to Phase 2 (AI Integration) when ready!

---

**Questions?** Refer to main README.md or contact support.
