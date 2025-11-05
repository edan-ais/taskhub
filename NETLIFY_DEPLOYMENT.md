# Netlify Deployment Guide

## Why You're Seeing a Blank White Screen

The blank screen issue on Netlify is caused by two common problems:

1. **Missing Environment Variables** - Your Supabase credentials aren't set in Netlify
2. **SPA Routing** - Netlify needs to know this is a single-page application

Both issues are now fixed in this repository, but you need to configure Netlify.

---

## Quick Fix Steps

### 1. Set Environment Variables in Netlify

Go to your Netlify site dashboard:

**Site configuration → Environment variables → Add a variable**

Add these two variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://nsxrwbqfyfrajhqinmhg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zeHJ3YnFmeWZyYWpocWlubWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTA0OTcsImV4cCI6MjA3NzY4NjQ5N30.7FIrl9OqoYAUz5gHFjMwxs6nETdzLtxEHm-R_S3R_Hk` |

**Scopes:** Select "All" or choose the specific branches you want these to apply to.

### 2. Trigger Redeploy

After adding environment variables:

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for build to complete
4. Your site should now work!

---

## What We Fixed

### Files Added/Modified

1. **`netlify.toml`** - Netlify configuration file
   - Sets publish directory to `dist`
   - Configures SPA redirects
   - Sets Node version

2. **`public/_redirects`** - Fallback for SPA routing
   - Ensures all routes redirect to index.html
   - Vite automatically copies this to dist folder

### How It Works

**Environment Variables:**
- Vite replaces `import.meta.env.VITE_*` at build time
- Without these variables, your app can't connect to Supabase
- This causes the white screen (JavaScript error in console)

**SPA Routing:**
- React apps use client-side routing
- Without redirects, refreshing on `/home` returns 404
- The _redirects file tells Netlify to serve index.html for all routes

---

## Troubleshooting

### Still seeing blank screen after deploying?

1. **Check Browser Console** (F12)
   - Look for errors mentioning Supabase
   - "Missing Supabase environment variables" = env vars not set

2. **Verify Environment Variables**
   - Go to Site settings → Environment variables
   - Make sure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
   - Check they're enabled for the correct branch (usually "All")

3. **Clear Deploy Cache**
   - Go to Site settings → Build & deploy → Clear cache and deploy site
   - This forces a fresh build with new environment variables

4. **Check Deploy Logs**
   - Go to Deploys tab → Click latest deploy → View logs
   - Look for build errors or warnings

### Common Issues

**Issue:** "Failed to fetch" or network errors
- **Cause:** Environment variables not set or incorrect
- **Fix:** Double-check the values match your `.env` file exactly

**Issue:** 404 errors when refreshing page
- **Cause:** _redirects not working
- **Fix:** Verify `netlify.toml` and `public/_redirects` exist

**Issue:** Build succeeds but app doesn't load
- **Cause:** JavaScript error preventing app from rendering
- **Fix:** Check browser console for specific error

---

## Testing Locally Before Deploy

To test the production build locally:

```bash
# Build the project
npm run build

# Preview the production build
npm run preview
```

This will show you exactly what Netlify will deploy. If it works locally but not on Netlify, it's an environment variable issue.

---

## Environment Variables Security

**Note:** The anon key in this guide is safe to expose publicly. It's designed for client-side use and has Row Level Security (RLS) protecting your data. However, never expose:

- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- Database passwords
- API secrets

---

## Deployment Checklist

Before each deploy:

- [ ] Environment variables set in Netlify
- [ ] `netlify.toml` exists in project root
- [ ] `public/_redirects` exists
- [ ] `.env` file is in `.gitignore` (never commit it)
- [ ] Project builds successfully locally (`npm run build`)
- [ ] Preview works locally (`npm run preview`)

---

## Alternative: Deploy from CLI

If you prefer CLI deployment:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

The CLI will read your local `.env` file, but you still need to set env vars in Netlify dashboard for continuous deployment.

---

## Next Steps

After successful deployment:

1. **Custom Domain** (optional)
   - Go to Domain management → Add custom domain
   - Follow DNS configuration instructions

2. **Enable Automatic Deploys**
   - Connect your Git repository
   - Deploys automatically on push to main branch

3. **Set Up Deploy Previews**
   - Get preview URLs for pull requests
   - Test changes before merging

---

## Support

If you continue to see issues:

1. Check the Netlify deploy logs for build errors
2. Verify environment variables are set correctly
3. Test the production build locally first
4. Check browser console for JavaScript errors
