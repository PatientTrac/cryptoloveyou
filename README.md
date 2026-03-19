# Crypto Love You - Static Site with Serverless Backend

A high-performance static website with Netlify Functions, Supabase database, and HubSpot CRM integration.

## 🏗️ Architecture

```
┌──────────────────┐
│   Static Site    │
│  (HTML/CSS/JS)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Netlify Functions│
│  (Serverless)    │
└────┬─────────┬───┘
     │         │
     ▼         ▼
┌─────────┐ ┌─────────┐
│Supabase │ │ HubSpot │
│Database │ │   CRM   │
└─────────┘ └─────────┘
```

## ✨ Features

### Phase 1 (Current)
- ✅ Static site deployment on Netlify
- ✅ Secure serverless functions (no exposed API keys)
- ✅ Supabase PostgreSQL database
- ✅ Real-time HubSpot CRM sync
- ✅ Contact form with validation & spam protection
- ✅ Rate limiting
- ✅ Row Level Security (RLS)

### Planned
- 🔄 Phase 2: AI chatbot + content automation
- 🔄 Phase 3: Affiliate tracking admin panel
- 🔄 Phase 4: SEO automation + social media integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Netlify account
- Supabase account
- HubSpot account with API key

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
HUBSPOT_API_KEY=your_hubspot_api_key_here
```

### 3. Run Supabase Migration

Go to your Supabase project dashboard:
1. Navigate to **SQL Editor**
2. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

### 4. Test Locally

```bash
npm run dev
```

Visit `http://localhost:8888` to see your site.

### 5. Deploy to Netlify

```bash
# Login to Netlify
npx netlify login

# Deploy
npm run deploy
```

Or connect your Git repository to Netlify for automatic deployments.

## 📁 Project Structure

```
.
├── netlify/
│   └── functions/
│       ├── submit-contact.js     # Handle contact form submissions
│       ├── hubspot-sync.js       # Manual HubSpot sync job
│       └── utils/
│           ├── supabase.js       # Supabase client & helpers
│           ├── hubspot.js        # HubSpot API integration
│           └── validation.js     # Input validation & sanitization
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema
├── contact/
│   └── index.html                # Contact page (updated)
├── netlify.toml                  # Netlify configuration
├── package.json                  # Dependencies
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

## 🔐 Security Features

### 1. No Exposed API Keys
- Supabase credentials moved to server-side functions
- Frontend only calls Netlify Functions

### 2. Input Validation
- Email format validation
- Input sanitization (XSS prevention)
- Length limits on all fields

### 3. Rate Limiting
- Max 5 requests per minute per email
- 429 response with Retry-After header

### 4. Spam Protection
- Honeypot field (hidden input)
- Server-side validation

### 5. Row Level Security (RLS)
- Supabase tables protected by RLS policies
- Service role used only in functions

## 🛠️ API Endpoints

### POST /.netlify/functions/submit-contact

Submit a contact form.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello!",
  "source": "contact_page"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Thank you for your message!",
  "contactId": 123
}
```

**Response (Error):**
```json
{
  "error": "Validation failed",
  "details": ["Email is required", "Message too short"]
}
```

### POST /.netlify/functions/hubspot-sync

Manually sync unsynced contacts to HubSpot.

**Headers:**
```
Authorization: Bearer YOUR_SYNC_API_KEY
```

**Response:**
```json
{
  "success": true,
  "message": "Sync job completed",
  "results": {
    "total": 10,
    "synced": 9,
    "failed": 1,
    "errors": [...]
  }
}
```

## 🗄️ Database Schema

### contacts
- `id` - Primary key
- `name` - Contact name
- `email` - Email address
- `message` - Message content
- `source` - Form source (e.g., "contact_page")
- `status` - Status (new, contacted, closed)
- `hubspot_contact_id` - HubSpot sync ID
- `created_at`, `updated_at` - Timestamps

### leads (Phase 1)
- UTM tracking fields
- Lead scoring
- HubSpot deal integration

### affiliate_tracking (Phase 3)
- Affiliate program details
- Click/conversion tracking
- Revenue tracking

## 🔄 HubSpot Integration

### How It Works

1. User submits contact form
2. Netlify Function validates & saves to Supabase
3. Function calls HubSpot API to create/update contact
4. HubSpot contact ID saved back to Supabase

### Manual Sync

If HubSpot sync fails, run manual sync:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/hubspot-sync \
  -H "Authorization: Bearer YOUR_SYNC_API_KEY"
```

## 📊 Monitoring & Logs

### Netlify Functions Logs
View logs in Netlify dashboard:
- **Functions** → **[Function Name]** → **Function log**

### Supabase Logs
View database logs:
- **Supabase Dashboard** → **Logs** → **Database**

## 🐛 Troubleshooting

### Contact form not working

1. Check browser console for errors
2. Verify Netlify Functions are deployed
3. Check environment variables in Netlify dashboard
4. Review function logs

### HubSpot sync failing

1. Verify HubSpot API key is valid
2. Check HubSpot rate limits
3. Review `hubspot-sync` function logs
4. Ensure contact properties exist in HubSpot

### Database errors

1. Verify Supabase service key is correct
2. Check RLS policies
3. Ensure migration was run successfully

## 📝 Environment Variables (Netlify)

Set these in Netlify dashboard under **Site settings** → **Environment variables**:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `HUBSPOT_API_KEY` | HubSpot private app API key | ✅ |
| `SYNC_API_KEY` | API key for manual sync endpoint | ⚠️ Optional |

## 🚦 Next Steps (Phase 2-4)

- [ ] Implement AI chatbot with Netlify AI Gateway
- [ ] Build affiliate tracking admin panel
- [ ] Add SEO automation
- [ ] Social media auto-posting

## 📧 Support

For questions or issues, contact the development team or open an issue in the repository.

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for Crypto Love You**
