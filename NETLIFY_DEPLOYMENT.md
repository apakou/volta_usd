# Netlify Deployment Guide for Volta USD Frontend

This guide will help you deploy your Next.js frontend application to Netlify.

## 📋 Prerequisites

1. A Netlify account (free at [netlify.com](https://netlify.com))
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Environment variables configured for production

## 🛠️ Configuration Files Added

The following files have been added/modified for Netlify deployment:

### 1. `netlify.toml` (Root directory)
- Configures build settings, redirects, and environment variables
- Sets the build directory to `packages/nextjs`
- Publishes from `packages/nextjs/out`

### 2. `packages/nextjs/next.config.mjs` (Modified)
- Added `output: 'export'` for static site generation
- Added `trailingSlash: true` for proper routing
- Added `images: { unoptimized: true }` for static export compatibility

### 3. `packages/nextjs/public/_redirects`
- Handles client-side routing for single-page application behavior

## ✅ Build Status

The application has been successfully configured for Netlify deployment! ✅

## 🚀 Deployment Steps

### Option 1: Automatic Deployment (Recommended)

1. **Push your changes to your Git repository:**
   ```bash
   git add .
   git commit -m "Add Netlify deployment configuration"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [netlify.com](https://netlify.com) and sign in
   - Click "New site from Git"
   - Choose your Git provider and repository
   - Netlify will automatically detect the `netlify.toml` configuration

3. **Configure Environment Variables:**
   In your Netlify dashboard, go to Site settings > Environment variables and add:
   
   **Required for production:**
   ```
   NEXT_PUBLIC_SEPOLIA_PROVIDER_URL=https://starknet-sepolia.blastapi.io/YOUR_API_KEY/rpc/v0_9
   NEXT_PUBLIC_MAINNET_PROVIDER_URL=https://starknet-mainnet.blastapi.io/YOUR_API_KEY/rpc/v0_9
   NEXT_PUBLIC_APP_URL=https://your-netlify-domain.netlify.app
   LIGHTNING_NETWORK=bitcoin
   LIGHTNING_MOCK_MODE=false
   ```
   
   **Optional (for Lightning features):**
   ```
   NEXT_PUBLIC_CHIPI_PAY_API_KEY=your_chipi_pay_api_key
   CHIPI_PAY_WEBHOOK_SECRET=your_webhook_secret
   PAYMENT_MIN_AMOUNT=1
   PAYMENT_MAX_AMOUNT=10000
   ```

4. **Deploy:**
   - Click "Deploy site"
   - Netlify will build and deploy your application automatically

### Option 2: Manual Deployment

1. **Test the build locally:**
   ```bash
   ./test-netlify-build.sh
   ```

2. **If build is successful, deploy manually:**
   - Install Netlify CLI: `npm install -g netlify-cli`
   - Login: `netlify login`
   - Deploy: `netlify deploy --prod --dir=packages/nextjs/out`

## 🔧 Build Configuration Details

- **Build Command:** `npm run build`
- **Publish Directory:** `packages/nextjs/out`
- **Base Directory:** `packages/nextjs`
- **Node Version:** 18 (specified in netlify.toml)

## 🌐 Environment Variables Guide

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SEPOLIA_PROVIDER_URL` | Starknet Sepolia RPC URL | `https://starknet-sepolia.blastapi.io/YOUR_KEY/rpc/v0_9` |
| `NEXT_PUBLIC_MAINNET_PROVIDER_URL` | Starknet Mainnet RPC URL | `https://starknet-mainnet.blastapi.io/YOUR_KEY/rpc/v0_9` |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL | `https://your-site.netlify.app` |

### Optional Variables (Lightning Features)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_CHIPI_PAY_API_KEY` | Chipi Pay API key | - |
| `CHIPI_PAY_WEBHOOK_SECRET` | Webhook secret | - |
| `LIGHTNING_NETWORK` | Network type | `bitcoin` |
| `LIGHTNING_MOCK_MODE` | Use mock responses | `false` |
| `PAYMENT_MIN_AMOUNT` | Minimum payment | `1` |
| `PAYMENT_MAX_AMOUNT` | Maximum payment | `10000` |

## 🔍 Troubleshooting

### Build Errors

1. **Node version issues:**
   - Ensure you're using Node 18+ (configured in netlify.toml)

2. **Environment variable errors:**
   - Check that all required variables are set in Netlify dashboard
   - Ensure `NEXT_PUBLIC_` prefix for client-side variables

3. **Image optimization errors:**
   - Images are configured as `unoptimized: true` for static export

4. **API route errors:**
   - API routes are not supported in static export
   - Move API logic to external services or serverless functions

### Common Issues

1. **404 on page refresh:**
   - The `_redirects` file should handle this
   - Ensure it's in the `public` directory

2. **Build timeout:**
   - Check for large dependencies or long-running build processes
   - Consider optimizing build process

## 📱 Custom Domain Setup

After successful deployment:

1. Go to your Netlify site dashboard
2. Click "Domain settings"
3. Add your custom domain
4. Update DNS records as instructed by Netlify
5. Update `NEXT_PUBLIC_APP_URL` environment variable

## 🔄 Continuous Deployment

Once connected to Git:
- Every push to your main branch triggers a new deployment
- Pull request deployments create preview URLs
- Rollback to previous deployments anytime from Netlify dashboard

## 📊 Monitoring

Netlify provides:
- Build logs and deployment history
- Analytics and performance metrics  
- Form handling (if used)
- Function logs (for serverless functions)

---

🎉 **Your Volta USD frontend is now ready for deployment!**

For questions or issues, check the [Netlify documentation](https://docs.netlify.com/) or the deployment logs in your Netlify dashboard.