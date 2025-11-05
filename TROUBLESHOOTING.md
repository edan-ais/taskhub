# 🔧 Troubleshooting Blank Screen on Netlify

## What I've Added to Help Debug

1. **Error Boundary** - Now shows a helpful error page instead of blank screen
2. **Better Error Messages** - Console logs show exactly what's missing
3. **Diagnostic Page** - Visit `/diagnostic.html` on your site to check configuration
4. **Improved Build Config** - Updated netlify.toml with better settings

---

## Step-by-Step Debugging

### Step 1: Check Your Netlify Deploy Logs

1. Go to Netlify Dashboard → **Deploys** tab
2. Click on the latest deploy
3. Look for **Deploy log** or **Function log**
4. Look for any errors or warnings during build

**What to look for:**
- ✅ "Build succeeded" or "Deploy succeeded"
- ❌ Any red error messages
- ⚠️ Warnings about missing packages

---

### Step 2: Visit the Diagnostic Page

After deploying, visit: `https://your-site.netlify.app/diagnostic.html`

This page will:
- Confirm files are loading
- Check if JavaScript bundle exists
- Give you specific instructions

---

### Step 3: Check Browser Console

1. Open your site: `https://your-site.netlify.app`
2. Press **F12** (or right-click → Inspect)
3. Go to **Console** tab
4. Look for errors in red

**Common errors and fixes:**

#### Error: "Missing Supabase environment variables"
**Cause:** Environment variables not set in Netlify
**Fix:**
1. Netlify Dashboard → Site configuration → Environment variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Important:** Set scope to "All" or your specific branch
4. Redeploy (Deploys tab → Trigger deploy)

#### Error: "Failed to fetch" or network errors
**Cause:** CORS or network connectivity issue
**Fix:**
1. Check Supabase URL is correct
2. Verify anon key is valid
3. Try accessing Supabase URL in browser to confirm it's reachable

#### Error: "Cannot read property of undefined"
**Cause:** JavaScript trying to access data before it loads
**Fix:** This is a code issue - check the console for the specific line

---

### Step 4: Verify Environment Variables in Netlify

This is the #1 cause of blank screens!

**How to verify:**

1. Go to: Netlify Dashboard → Site configuration → Environment variables
2. **Check these exist:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **Verify the values:**
   - URL should be: `https://nsxrwbqfyfrajhqinmhg.supabase.co`
   - Key should start with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **Check the scope:**
   - Should be set to "All" OR your specific branch name
   - If set to wrong branch, variables won't be available!

5. **Verify they're not marked as "Secret"**
   - These need to be available at build time
   - Secret variables are only for runtime/functions

---

### Step 5: Clear Cache and Redeploy

Sometimes Netlify caches the old build:

1. Site settings → Build & deploy → **Clear cache and deploy site**
2. Wait for build to complete
3. **Hard refresh** your browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

### Step 6: Check Build Command

Make sure Netlify is using the correct build command:

1. Site configuration → Build & deploy → Build settings
2. **Build command** should be: `npm run build`
3. **Publish directory** should be: `dist`

---

### Step 7: Test Locally First

Before deploying, test the production build locally:

```bash
# Set environment variables
export VITE_SUPABASE_URL="https://nsxrwbqfyfrajhqinmhg.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Build
npm run build

# Preview
npm run preview
```

If it works locally but not on Netlify = environment variable issue!

---

## Most Common Issue: Environment Variables

**Checklist:**
- [ ] Both variables are set in Netlify
- [ ] Values are correct (no typos, no extra spaces)
- [ ] Scope is set to "All" or correct branch
- [ ] Variables are NOT secret/hidden
- [ ] You redeployed AFTER adding variables
- [ ] You cleared cache before redeploying

---

## What the Error Boundary Shows

If environment variables are missing, you'll now see a **red error page** instead of blank screen that says:

> **Configuration Error**
> Missing Supabase environment variables

This is actually good! It means:
- ✅ Your app is loading
- ✅ Build succeeded
- ❌ Environment variables are missing/wrong

Just follow the on-screen instructions to fix it.

---

## Still Having Issues?

### Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Refresh page
4. Look for:
   - Red/failed requests
   - 404 errors (file not found)
   - 500 errors (server error)

### Check Build Logs Detail

Look for these specific messages:

**Good signs:**
```
✓ building...
✓ 3112 modules transformed
✓ built in 9s
```

**Bad signs:**
```
✗ Build failed
Error: Module not found
Failed to compile
```

---

## Emergency Recovery

If nothing works, try this nuclear option:

1. **Delete the site** from Netlify
2. **Create a new site**
3. **Connect repository** again
4. **Add environment variables** BEFORE first deploy
5. Deploy

---

## Getting Help

If you're still stuck, you need to provide:

1. **Deploy log** (full text from Netlify)
2. **Browser console errors** (screenshot or text)
3. **Network tab** (screenshot showing failed requests)
4. **Environment variables** (confirm they're set - don't share the actual values publicly!)

---

## Quick Reference

**Your Supabase Values:**
- URL: `https://nsxrwbqfyfrajhqinmhg.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zeHJ3YnFmeWZyYWpocWlubWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTA0OTcsImV4cCI6MjA3NzY4NjQ5N30.7FIrl9OqoYAUz5gHFjMwxs6nETdzLtxEHm-R_S3R_Hk`

**Netlify Environment Variable Names:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Note: The `VITE_` prefix is required for Vite to expose them to the browser!

---

## Success Indicators

You'll know it's working when:
- ✅ Page loads (not blank)
- ✅ You see the login or main interface
- ✅ No errors in console
- ✅ Data loads from Supabase
