#!/bin/bash

echo "🚀 Netlify build script starting..."

# Set environment variables
export HUSKY=0
export NODE_ENV=production

echo "📦 Installing dependencies..."
# Copy env file first
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.example..."
    cp .env.example .env
fi

# Simple npm install with legacy peer deps
echo "📦 Running npm install..."
npm install --legacy-peer-deps

echo "🔨 Building Next.js application..."
npm run build

echo "✅ Build completed!"