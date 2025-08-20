#!/bin/bash
set -e

echo "🚀 Quick Firebase Deployment"

# Use FIREBASE_CONFIG_JSON secret for authentication
if [ -z "$FIREBASE_CONFIG_JSON" ]; then
    echo "❌ FIREBASE_CONFIG_JSON secret not configured"
    echo "Configure in Replit Secrets with your Firebase service account JSON"
    exit 1
fi

# Setup authentication
echo "$FIREBASE_CONFIG_JSON" > /tmp/service-account.json
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/service-account.json"

# Get project ID
PROJECT_ID=$(echo "$FIREBASE_CONFIG_JSON" | grep -o '"project_id": *"[^"]*"' | cut -d'"' -f4)

# Build and deploy
echo "Building..."
npm run build
cd functions && npm run build && cd ..

echo "Deploying to Firebase..."
firebase deploy --only hosting,functions --project "$PROJECT_ID"

# Cleanup
rm -f /tmp/service-account.json

echo "✅ Deployed to https://crednxt.com"