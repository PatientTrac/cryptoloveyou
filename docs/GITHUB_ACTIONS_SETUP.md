# GitHub Actions Setup Guide

## Overview

This project uses GitHub Actions to automatically generate trending SEO articles daily at 9 AM UTC.

## How It Works

1. **Scheduled Trigger**: GitHub Action runs daily at 9 AM UTC
2. **Fetch Trending Data**: Script calls LunarCrush API to get the top trending cryptocurrency
3. **Generate Content**: Claude AI (Anthropic) generates article content
4. **Create HTML**: Script renders the article using Handlebars templates
5. **Commit & Push**: Article is committed to the repository
6. **Auto Deploy**: Netlify automatically deploys the new article

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the following:

### Required Secrets

| Secret Name | Description | Where to Get It |
|------------|-------------|-----------------|
| `ANTHROPIC_API_KEY` | Claude AI API key | https://console.anthropic.com/settings/keys |
| `LUNARCRUSH_API_KEY` | LunarCrush API key | https://lunarcrush.com/developers/api |
| `ARTICLE_GENERATION_API_KEY` | Internal API key for article generation | Use: `cloveyou_gen_2026_k9Qm3x7pV1n8aZ2rT6yW4uH0sJ5dF9` |
| `BINANCE_AFFILIATE_URL` | Your Binance referral link | Your affiliate dashboard |
| `COINBASE_AFFILIATE_URL` | Your Coinbase referral link | Your affiliate dashboard |
| `BYBIT_AFFILIATE_URL` | Your Bybit referral link | Your affiliate dashboard |
| `LEDGER_AFFILIATE_URL` | Your Ledger referral link | Your affiliate dashboard |
| `TREZOR_AFFILIATE_URL` | Your Trezor referral link | Your affiliate dashboard |

### Getting the Values

**⚠️ Important**: You need to get these values from your accounts:

- `ANTHROPIC_API_KEY`: From your `.env` file or Netlify environment variables
- `LUNARCRUSH_API_KEY`: From your `.env` file or Netlify environment variables
- `ARTICLE_GENERATION_API_KEY`: From your `.env` file or Netlify environment variables
- Affiliate URLs: Replace `YOUR_REF` and `YOUR_ID` with your actual affiliate IDs

**Contact your developer** if you need help finding these values.

## Manual Trigger

You can manually trigger article generation:

1. Go to **Actions** tab in GitHub
2. Select **Generate Trending SEO Article** workflow
3. Click **Run workflow** button
4. Select the branch and click **Run workflow**

## Testing Locally

To test the script locally before committing:

```bash
# Install dependencies
npm install

# Set environment variables in .env file
cp .env.example .env
# Edit .env with your API keys

# Run the script
node scripts/generate-trending-article.js
```

## Monitoring

- **Workflow Runs**: Check GitHub Actions tab to see execution history
- **Logs**: Click on any workflow run to see detailed logs
- **Failures**: You'll receive email notifications if the workflow fails

## Troubleshooting

### "Article generation failed" Error

Check the workflow logs for specific error messages:
- **Credit balance too low**: Add credits to your Anthropic account
- **LunarCrush API error**: Check your API key and rate limits
- **Git push failed**: Ensure GitHub token has write permissions

### No New Article Generated

Possible causes:
- Workflow didn't run (check schedule)
- Same slug already exists (only generates new articles)
- API rate limits exceeded

## Cost Estimates

- **GitHub Actions**: Free tier includes 2,000 minutes/month (plenty for daily runs)
- **Anthropic API**: ~$0.03-0.10 per article (depending on length)
- **LunarCrush API**: Free tier should be sufficient

## Next Steps

1. ✅ Add all required secrets to GitHub
2. ✅ Update affiliate URLs with real referral links
3. ✅ Test the workflow manually
4. ✅ Monitor the first automated run

---

**Questions?** Contact your developer or check the GitHub Actions documentation.
