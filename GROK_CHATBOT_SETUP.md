# Grok AI Chatbot Setup Instructions

## 📌 Current Status
- ✅ Widget code is ready (`/js/grok-chat-widget.js`)
- ✅ Netlify function is deployed (`/netlify/functions/grok-chat.js`)
- ✅ UI is styled and responsive
- ⏸️ **Widget is COMMENTED OUT** - waiting for Grok API key from client

## 🔑 What You Need from Client

**Grok API Key from xAI**
- Client needs to sign up at: https://console.x.ai
- Create API key (starts with `xai_...`)
- Provide the key to you

## 🚀 How to Enable the Chatbot

### Step 1: Add API Key to Environment Variables

**Local `.env` file:**
```bash
# Add this line to .env file
GROK_API_KEY=xai_provided_by_client_here
```

**Netlify Dashboard:**
1. Go to https://app.netlify.com
2. Select `cryptoloveyou` site
3. **Site configuration** → **Environment variables**
4. Add variable:
   - Key: `GROK_API_KEY`
   - Value: `xai_...` (from client)

### Step 2: Uncomment the Widget

**In `index.html` (line ~2083):**

Change this:
```html
<!-- <script src="/js/grok-chat-widget.js" defer></script> -->
```

To this:
```html
<script src="/js/grok-chat-widget.js" defer></script>
```

### Step 3: Test Locally

```bash
netlify dev
# Open http://localhost:8888
# Click the floating chatbot button (bottom-right)
# Test a message
```

### Step 4: Deploy

```bash
git add index.html
git commit -m "Enable Grok AI chatbot with API key"
git push
```

## 🎨 Widget Features

- **Floating button** - Bottom-right corner with animated rings
- **5 Quick prompts:**
  - AI Crypto Projects
  - How to Buy Crypto
  - Best Wallets
  - Make Money with AI
  - Crypto Taxes 2026
- **Dark theme** - Matches site aesthetic
- **Responsive** - Full screen on mobile
- **AI responses** - Powered by Grok-4 model

## 📧 API Configuration

The chatbot is configured to:
- Model: `grok-4` (or `grok-beta` if specified in env)
- Max tokens: 900
- Temperature: 0.75
- System prompt: Crypto + AI education assistant for CryptoLoveYou.com

## 🔧 Customization (Optional)

**Change AI model:**
```bash
# In .env or Netlify env vars
GROK_MODEL=grok-beta
```

**Modify quick prompts:**
Edit `/js/grok-chat-widget.js` lines 39-43

**Change colors:**
Edit Tailwind classes in `/js/grok-chat-widget.js`

## 📞 Client Communication Template

```
Hi [Client],

We've built the Grok AI chatbot for CryptoLoveYou.com! It's fully coded and ready to go.

To activate it, we need a Grok API key from xAI:

1. Go to https://console.x.ai
2. Sign up/login with your X (Twitter) account
3. Create an API key
4. Send us the key (starts with "xai_...")

Once we have it, the chatbot will be live on the site within minutes!

Features:
✅ AI-powered crypto & AI education assistant
✅ 5 quick-answer buttons for common questions
✅ Beautiful dark theme matching your site
✅ Mobile responsive

Let me know when you have the API key!
```

## 📁 Files Involved

- `index.html` - Widget script tag (commented out)
- `js/grok-chat-widget.js` - Widget UI and logic
- `netlify/functions/grok-chat.js` - Backend API handler
- `.env` - GROK_API_KEY configuration

---

**Ready to enable:** Just need the API key! 🚀
