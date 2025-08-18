#!/bin/bash
set -e

echo "🚀 Starting Firebase deployment with service account credentials..."

# Check if FIREBASE_CONFIG_JSON secret exists
if [ -z "$FIREBASE_CONFIG_JSON" ]; then
    echo "❌ Error: FIREBASE_CONFIG_JSON secret not found"
    echo "🔧 Please ensure the service account JSON is stored in secrets as FIREBASE_CONFIG_JSON"
    exit 1
fi

# Create temporary service account file
echo "🔐 Setting up service account credentials..."
echo "$FIREBASE_CONFIG_JSON" > /tmp/firebase-service-account.json

# Set environment variable for Google Cloud authentication
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/firebase-service-account.json"

# Extract project ID from service account JSON for validation
PROJECT_ID=$(echo "$FIREBASE_CONFIG_JSON" | grep -o '"project_id": *"[^"]*"' | cut -d'"' -f4)
echo "📋 Project ID: $PROJECT_ID"

# Set the project for Firebase CLI without authentication (using service account)
echo "🔑 Setting Firebase project..."
npx firebase use "$PROJECT_ID"

echo "🏗️  Building application..."

# Clean previous builds
rm -rf dist/
mkdir -p dist

# Build the client
echo "🎨 Building frontend..."
npm run build

# Verify client build
if [ ! -f "dist/public/index.html" ]; then
    echo "❌ Error: Frontend build failed - index.html not found"
    exit 1
fi

# Build functions
echo "⚙️  Building Firebase Functions..."
cd functions
npm install
npm run build
cd ..

# Verify functions build  
if [ ! -f "functions/lib/index.js" ]; then
    echo "❌ Error: Functions build failed - index.js not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Firebase using service account authentication
echo "🚀 Deploying to Firebase..."
npx firebase deploy --project "$PROJECT_ID" --force

# Cleanup temporary files
echo "🧹 Cleaning up temporary files..."
rm -f /tmp/firebase-service-account.json

echo "🎉 Firebase deployment completed successfully!"
echo "🌐 Your application should now be available at: https://$PROJECT_ID.web.app"
echo "📊 Check the Firebase Console for deployment details: https://console.firebase.google.com/project/$PROJECT_ID"