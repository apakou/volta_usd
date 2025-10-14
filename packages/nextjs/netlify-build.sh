#!/bin/bash

echo "🚀 Netlify build script starting..."

# Set environment variables to skip problematic scripts
export HUSKY=0
export NODE_ENV=production

echo "📦 Installing dependencies..."
# Copy env file before install to avoid postinstall script errors
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.example..."
    cp .env.example .env || true
fi

# Install dependencies with legacy peer deps (allowing postinstall but env file exists)
npm install --legacy-peer-deps

echo "🔨 Building Next.js application..."
# Build the application
npm run build

echo "✅ Build completed successfully!"