#!/bin/bash

# CredNXT Production Build Script
# This script creates a production-ready build with proper validation

set -e

echo "🏗️  Starting CredNXT production build..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate Node.js version
if ! command_exists node; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Error: Node.js version 16+ required, found: $(node --version)"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Validate npm
if ! command_exists npm; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run from project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --production=false
else
    echo "✅ Dependencies already installed"
fi

# Validate environment variables for production
echo "🔍 Validating environment variables..."

REQUIRED_BACKEND_VARS=(
    "JWT_SECRET"
    "FIREBASE_PROJECT_ID"
    "FIREBASE_PRIVATE_KEY"
    "FIREBASE_CLIENT_EMAIL"
)

REQUIRED_FRONTEND_VARS=(
    "VITE_FIREBASE_API_KEY"
    "VITE_FIREBASE_AUTH_DOMAIN"
    "VITE_FIREBASE_PROJECT_ID"
    "VITE_FIREBASE_STORAGE_BUCKET"
    "VITE_FIREBASE_MESSAGING_SENDER_ID"
    "VITE_FIREBASE_APP_ID"
)

MISSING_VARS=()

# Check backend variables
for var in "${REQUIRED_BACKEND_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

# Check frontend variables
for var in "${REQUIRED_FRONTEND_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "🔧 To fix this:"
    echo "   1. Copy .env.example to .env"
    echo "   2. Fill in all required values"
    echo "   3. Source the environment: source .env"
    echo "   4. Check DEPLOYMENT_CHECKLIST.md for detailed setup"
    exit 1
fi

echo "✅ All required environment variables are set"

# Validate JWT secret
if [ "$JWT_SECRET" = "your_secure_jwt_secret_here" ] || [ "$JWT_SECRET" = "fallback-secret-please-change-in-production" ]; then
    echo "❌ Error: JWT_SECRET is still set to default value"
    echo "🔧 Generate a secure secret: openssl rand -base64 32"
    exit 1
fi

echo "✅ JWT secret is properly configured"

# Validate Firebase API key format
if [[ ! "$VITE_FIREBASE_API_KEY" =~ ^AIza.* ]]; then
    echo "❌ Error: VITE_FIREBASE_API_KEY appears to be invalid (should start with 'AIza')"
    exit 1
fi

echo "✅ Firebase configuration appears valid"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
mkdir -p dist

# Type checking
echo "🔍 Running TypeScript checks..."
npm run check || {
    echo "❌ TypeScript check failed. Please fix type errors before building."
    exit 1
}

echo "✅ TypeScript checks passed"

# Build frontend
echo "🎨 Building frontend..."
npm run build 2>&1 | grep -v "Module level directives cause errors when bundled"

# Verify frontend build
if [ ! -f "dist/public/index.html" ]; then
    echo "❌ Error: Frontend build failed - index.html not found"
    exit 1
fi

echo "✅ Frontend build completed"

# Verify backend build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: Backend build failed - index.js not found"
    exit 1
fi

echo "✅ Backend build completed"

# Build verification
echo "🧪 Verifying build integrity..."

# Check if main server file exists and is not empty
if [ ! -s "dist/index.js" ]; then
    echo "❌ Error: Backend build file is empty or missing"
    exit 1
fi

# Check if frontend assets exist
if [ ! -d "dist/public/assets" ]; then
    echo "❌ Error: Frontend assets not found"
    exit 1
fi

# Get build sizes
BACKEND_SIZE=$(du -h dist/index.js | cut -f1)
FRONTEND_SIZE=$(du -sh dist/public | cut -f1)

echo "✅ Build verification completed"
echo ""
echo "📊 Build Summary:"
echo "   Backend size: $BACKEND_SIZE"
echo "   Frontend size: $FRONTEND_SIZE"
echo "   Build output: dist/"
echo ""
echo "🚀 Production build ready!"
echo ""
echo "🔍 To test locally:"
echo "   NODE_ENV=production node dist/index.js"
echo ""
echo "📋 For deployment:"
echo "   1. Upload dist/ directory to your server"
echo "   2. Set environment variables on production server"
echo "   3. Run: NODE_ENV=production node dist/index.js"
echo "   4. Check DEPLOYMENT_CHECKLIST.md for platform-specific instructions"