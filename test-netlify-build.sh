#!/bin/bash

echo "🚀 Testing Netlify build locally..."

# Navigate to the Next.js package directory
cd packages/nextjs

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Create environment file from example
echo "⚙️  Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Your app is ready for Netlify deployment."
    echo "📁 Build output is in: packages/nextjs/out"
    echo ""
    echo "Next steps:"
    echo "1. Push your changes to GitHub"
    echo "2. Connect your repository to Netlify"
    echo "3. Deploy automatically with the netlify.toml configuration"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi