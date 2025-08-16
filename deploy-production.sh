#!/bin/bash

echo "🚀 Force deploying latest CredNXT build to Firebase..."

# First, verify we have the latest build
if [ ! -f "dist/public/assets/index-B-9aJOjN.js" ]; then
    echo "❌ Latest build not found! Building now..."
    npm run build
fi

# Verify build files exist
echo "📄 Current build files:"
ls -la dist/public/assets/

# Show file sizes
echo "📊 Bundle sizes:"
du -sh dist/public/assets/*

# Manual deployment using Firebase REST API (since CLI has auth issues)
echo "🔧 Preparing manual deployment..."

# Check current vs new bundle
NEW_BUNDLE=$(ls dist/public/assets/index-*.js | head -1 | xargs basename)
echo "🆕 New bundle: $NEW_BUNDLE"

PROD_BUNDLE=$(curl -s "https://crednxt-ef673.web.app/" | grep -o 'index-[A-Za-z0-9\-]*\.js')
echo "🌐 Current production bundle: $PROD_BUNDLE"

if [ "$NEW_BUNDLE" = "$PROD_BUNDLE" ]; then
    echo "✅ Production is up to date"
else
    echo "⚠️  Production needs update: $PROD_BUNDLE -> $NEW_BUNDLE"
    echo ""
    echo "Manual deployment steps:"
    echo "1. Run: firebase login (if not logged in)"
    echo "2. Run: firebase deploy --only hosting --project crednxt-ef673"
    echo ""
    echo "Expected production URL: https://crednxt-ef673.web.app/offers/test-offer-123"
fi

echo "🎯 Deployment check complete"