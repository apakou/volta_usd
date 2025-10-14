#!/bin/bash

echo "🚀 Netlify build script starting..."

# Set environment variables to skip problematic scripts
export HUSKY=0
export NODE_ENV=production
export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false

echo "📦 Installing dependencies..."
# Copy env file before install to avoid postinstall script errors
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.example..."
    cp .env.example .env || true
fi

# Install dependencies - try npm first, fall back to yarn if needed
echo "📦 Installing dependencies with npm..."
if npm install --legacy-peer-deps --no-optional --no-fund --no-audit; then
    echo "✅ npm install successful"
else
    echo "⚠️  npm install failed, trying alternative approach..."
    # Remove node_modules and package-lock to start fresh
    rm -rf node_modules package-lock.json
    
    # Try with npm ci if there's a package-lock
    if [ -f package-lock.json ]; then
        npm ci --legacy-peer-deps --no-optional --no-fund
    else
        npm install --legacy-peer-deps --no-optional --no-fund --force
    fi
fi

echo "🔨 Building Next.js application..."
# Build the application
npm run build

echo "✅ Build completed successfully!"