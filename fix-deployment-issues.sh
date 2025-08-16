#!/bin/bash

# CredNXT Deployment Issues Auto-Fix Script
# This script automatically fixes common deployment configuration issues

set -e

echo "🔧 CredNXT Deployment Auto-Fix"
echo "==============================="

# Generate secure JWT secret if missing or using default
generate_jwt_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 32
    elif command -v node >/dev/null 2>&1; then
        node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    else
        # Fallback method
        echo "$(date +%s)$(hostname)$(whoami)" | sha256sum | base64 | head -c 32
    fi
}

# Check and fix JWT_SECRET
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_secure_jwt_secret_here" ] || [ "$JWT_SECRET" = "fallback-secret-please-change-in-production" ]; then
    echo "🔑 Generating secure JWT secret..."
    NEW_JWT_SECRET=$(generate_jwt_secret)
    
    if [ -f ".env" ]; then
        # Update existing .env file
        if grep -q "JWT_SECRET=" .env; then
            sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$NEW_JWT_SECRET|" .env
        else
            echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env
        fi
        echo "✅ Updated JWT_SECRET in .env file"
    else
        # Create new .env file
        cp .env.example .env
        sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$NEW_JWT_SECRET|" .env
        echo "✅ Created .env file with secure JWT_SECRET"
    fi
    
    export JWT_SECRET="$NEW_JWT_SECRET"
    echo "🔐 New JWT secret generated and set"
else
    echo "✅ JWT_SECRET is already properly configured"
fi

# Update browserslist database to fix warning
if command -v npx >/dev/null 2>&1; then
    echo "📦 Updating browserslist database..."
    npx update-browserslist-db@latest >/dev/null 2>&1 || echo "⚠️  Could not update browserslist (non-critical)"
fi

# Install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Run build if dist doesn't exist or is incomplete
if [ ! -f "dist/index.js" ] || [ ! -f "dist/public/index.html" ]; then
    echo "🏗️  Building application..."
    npm run build
fi

echo ""
echo "🎉 Auto-fix completed!"
echo ""
echo "Next steps:"
echo "1. Set your Firebase environment variables (see FIREBASE_SETUP_GUIDE.md)"
echo "2. Run './validate-deployment.sh' to verify all issues are resolved"
echo "3. Test locally with 'npm start'"
echo "4. Deploy to your platform"