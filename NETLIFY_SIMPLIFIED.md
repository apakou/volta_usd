# 🔧 Netlify Deployment - Simplified Approach

## Latest Changes (Final Attempt) ✅

I've switched to a **much simpler approach** that should work:

### What Changed:

1. **✅ Restored API Routes** - Moved back from `api-disabled` to `app/api`
2. **✅ Re-enabled Next.js Plugin** - Using `@netlify/plugin-nextjs` for proper handling
3. **✅ Simplified Build Script** - Removed complex yarn removal and registry overrides
4. **✅ Basic npm install** - Just `npm install --legacy-peer-deps` and `npm run build`
5. **✅ Removed publish directory** - Let the Next.js plugin handle it automatically

### Current Configuration:

**netlify.toml:**
```toml
[build]
  base = "packages/nextjs"
  command = "./netlify-build.sh"

[build.environment]
  NODE_VERSION = "20"
  HUSKY = "0"
  NODE_ENV = "production"
  # ... other env vars
  
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Build Script (netlify-build.sh):**
```bash
#!/bin/bash
echo "🚀 Netlify build script starting..."
export HUSKY=0
export NODE_ENV=production

# Copy env file
cp .env.example .env

# Simple install and build
npm install --legacy-peer-deps
npm run build
```

## Why This Should Work:

1. **No yarn conflicts** - Simple npm install without removing yarn
2. **Next.js plugin** - Handles publish directory and serverless functions automatically  
3. **API routes supported** - Full Next.js functionality with API routes
4. **Minimal complexity** - Just the essential steps

## Environment Variables Needed:

Make sure these are set in your Netlify dashboard:

```bash
NEXT_PUBLIC_SEPOLIA_PROVIDER_URL=https://starknet-sepolia.blastapi.io/64168c77-3fa5-4e1e-9fe4-41675d212522/rpc/v0_9
NEXT_PUBLIC_MAINNET_PROVIDER_URL=https://starknet-mainnet.blastapi.io/64168c77-3fa5-4e1e-9fe4-41675d212522/rpc/v0_9
NEXT_PUBLIC_APP_URL=https://your-netlify-domain.netlify.app
NEXT_PUBLIC_CHIPI_PAY_API_KEY=pk_prod_2094b9c9b93a84f162a0d9f2b19f358d
CHIPI_PAY_WEBHOOK_SECRET=sk_prod_ff69f3e8cea16ed55c34d5c5f6b9ab044e913e8af2532cf1141ddf1545226210
NODE_ENV=production
HUSKY=0
LIGHTNING_NETWORK=testnet
LIGHTNING_MOCK_MODE=false
```

## What Happens Now:

1. **Netlify will auto-deploy** from the latest commit
2. **Uses Node 20** with proper Next.js plugin
3. **API routes work** as serverless functions
4. **Lightning features** ready with your production keys

---

🎯 **This simplified approach should finally work!** The complex yarn/registry issues are avoided, and we're letting the Next.js plugin handle the deployment properly.

Monitor your Netlify dashboard for the deployment status. 🚀