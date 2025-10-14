#!/bin/bash

echo "🚀 Netlify build script starting..."

# Set environment variables to skip problematic scripts and disable yarn
export HUSKY=0
export NODE_ENV=production
export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
export COREPACK_ENABLE_STRICT=0

# Disable yarn and corepack completely
export PATH=$(echo $PATH | tr ':' '\n' | grep -v yarn | tr '\n' ':')
export PATH=$(echo $PATH | tr ':' '\n' | grep -v corepack | tr '\n' ':')

# Remove yarn files to force npm usage
rm -f yarn.lock .yarnrc.yml
rm -rf .yarn

echo "📦 Installing dependencies..."
# Copy env file before install to avoid postinstall script errors
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.example..."
    cp .env.example .env || true
fi

# Clean install with npm only
echo "📦 Installing dependencies with npm (yarn disabled)..."
rm -rf node_modules package-lock.json

# First install without scripts to avoid shx issue
npm install --legacy-peer-deps --registry https://registry.npmjs.org/ --no-fund --no-audit --ignore-scripts

# Then install shx specifically if needed
npm install shx --legacy-peer-deps --no-fund --no-audit || true

# Run postinstall manually if .env doesn't exist
if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
fi

echo "🔨 Building Next.js application..."
# Build the application with npm explicitly
NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ npm run build

echo "✅ Build completed successfully!"