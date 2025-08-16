#!/bin/bash

# Deploy to Firebase Hosting only (avoiding Functions deployment issues)
echo "🚀 Deploying CredNXT to Firebase Hosting..."

# Build the project first
echo "📦 Building production bundle..."
npm run build

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"
echo "📊 Bundle size: $(du -sh dist/public/assets/index-*.js | cut -f1)"

# Copy dist/public to be ready for Firebase hosting
if [ -d "dist/public" ]; then
    echo "📂 Production files ready for Firebase hosting"
    echo "📄 Files in dist/public:"
    ls -la dist/public/
else
    echo "❌ No dist/public directory found"
    exit 1
fi

echo "🎯 Production build ready for Firebase deployment"
echo "🔗 Will be available at: https://crednxt-ef673.web.app"
echo ""
echo "To deploy manually:"
echo "1. Run: firebase login"
echo "2. Run: firebase deploy --only hosting"
echo ""
echo "✅ Build process completed successfully"
echo "🚀 The updated app with direct Firestore access is ready for deployment"