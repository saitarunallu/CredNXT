#!/bin/bash

# CredNXT Deployment Validation Script
# This script checks for common deployment issues and provides fixes

set -e

echo "🔍 CredNXT Deployment Validation"
echo "================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ((ERRORS++))
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ((WARNINGS++))
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "INFO")
            echo -e "ℹ️  $message"
            ;;
    esac
}

# Check if .env exists
if [ ! -f ".env" ]; then
    print_status "WARNING" ".env file not found - using system environment variables"
    print_status "INFO" "Consider copying .env.example to .env for local development"
else
    print_status "SUCCESS" ".env file found"
    # Source .env if it exists
    source .env
fi

echo ""
echo "🔧 Environment Variable Checks"
echo "==============================="

# Required backend variables
BACKEND_VARS=(
    "JWT_SECRET:Critical for authentication security"
    "FIREBASE_PROJECT_ID:Firebase project identifier"
    "FIREBASE_PRIVATE_KEY:Firebase Admin SDK authentication"
    "FIREBASE_CLIENT_EMAIL:Firebase service account email"
)

echo "Backend Variables:"
for var_info in "${BACKEND_VARS[@]}"; do
    IFS=':' read -r var_name description <<< "$var_info"
    if [ -z "${!var_name}" ]; then
        print_status "ERROR" "$var_name is missing - $description"
    else
        if [ "$var_name" = "JWT_SECRET" ] && [[ "${!var_name}" == *"fallback"* || "${!var_name}" == *"your_secure"* ]]; then
            print_status "ERROR" "$var_name is using default/placeholder value"
        elif [ "$var_name" = "FIREBASE_PRIVATE_KEY" ] && [[ "${!var_name}" != *"BEGIN PRIVATE KEY"* ]]; then
            print_status "ERROR" "$var_name appears to be malformed (missing PEM headers)"
        else
            # Mask sensitive values
            if [[ "$var_name" == *"KEY"* || "$var_name" == *"SECRET"* ]]; then
                masked_value="${!var_name:0:10}..."
                print_status "SUCCESS" "$var_name is set ($masked_value)"
            else
                print_status "SUCCESS" "$var_name is set (${!var_name})"
            fi
        fi
    fi
done

echo ""
echo "Frontend Variables:"
# Required frontend variables
FRONTEND_VARS=(
    "VITE_FIREBASE_API_KEY:Firebase Web API key"
    "VITE_FIREBASE_AUTH_DOMAIN:Firebase authentication domain"
    "VITE_FIREBASE_PROJECT_ID:Firebase project ID (frontend)"
    "VITE_FIREBASE_STORAGE_BUCKET:Firebase storage bucket"
    "VITE_FIREBASE_MESSAGING_SENDER_ID:Firebase messaging sender"
    "VITE_FIREBASE_APP_ID:Firebase web app ID"
)

for var_info in "${FRONTEND_VARS[@]}"; do
    IFS=':' read -r var_name description <<< "$var_info"
    if [ -z "${!var_name}" ]; then
        print_status "ERROR" "$var_name is missing - $description"
    else
        if [ "$var_name" = "VITE_FIREBASE_API_KEY" ] && [[ "${!var_name}" != AIza* ]]; then
            print_status "WARNING" "$var_name should start with 'AIza' for web API keys"
        else
            print_status "SUCCESS" "$var_name is set (${!var_name})"
        fi
    fi
done

echo ""
echo "🏗️  Build System Checks"
echo "======================"

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 16 ]; then
        print_status "SUCCESS" "Node.js version: $NODE_VERSION"
    else
        print_status "ERROR" "Node.js version $NODE_VERSION is too old (minimum: v16)"
    fi
else
    print_status "ERROR" "Node.js is not installed"
fi

# Check if package.json exists
if [ -f "package.json" ]; then
    print_status "SUCCESS" "package.json found"
else
    print_status "ERROR" "package.json not found"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "SUCCESS" "Dependencies installed (node_modules exists)"
else
    print_status "WARNING" "Dependencies not installed - run 'npm install'"
fi

# Check for build directory
if [ -d "dist" ]; then
    if [ -f "dist/index.js" ] && [ -f "dist/public/index.html" ]; then
        print_status "SUCCESS" "Previous build found (dist/ directory with frontend and backend)"
    else
        print_status "WARNING" "Incomplete build found - run 'npm run build'"
    fi
else
    print_status "INFO" "No previous build found - will need to run 'npm run build'"
fi

echo ""
echo "🔥 Firebase Configuration"
echo "========================"

# Test Firebase connection (if possible)
if command -v curl >/dev/null 2>&1; then
    if [ -n "$VITE_FIREBASE_PROJECT_ID" ]; then
        echo "Testing Firebase project connectivity..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$VITE_FIREBASE_PROJECT_ID.firebaseapp.com" || echo "000")
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
            print_status "SUCCESS" "Firebase project is accessible"
        else
            print_status "WARNING" "Firebase project connectivity issue (HTTP $HTTP_CODE)"
        fi
    fi
else
    print_status "INFO" "curl not available - skipping connectivity tests"
fi

echo ""
echo "🚀 Deployment Readiness"
echo "======================"

# Check TypeScript compilation
if [ -f "tsconfig.json" ]; then
    print_status "SUCCESS" "TypeScript configuration found"
    if command -v npx >/dev/null 2>&1; then
        echo "Running TypeScript check..."
        if npm run check >/dev/null 2>&1; then
            print_status "SUCCESS" "TypeScript compilation passes"
        else
            print_status "ERROR" "TypeScript compilation failed - run 'npm run check' for details"
        fi
    fi
else
    print_status "WARNING" "No TypeScript configuration found"
fi

# Security checks
echo ""
echo "🔒 Security Validation"
echo "====================="

if [ -n "$JWT_SECRET" ]; then
    JWT_LENGTH=${#JWT_SECRET}
    if [ $JWT_LENGTH -lt 32 ]; then
        print_status "WARNING" "JWT_SECRET is short ($JWT_LENGTH chars) - recommend 32+ characters"
    else
        print_status "SUCCESS" "JWT_SECRET has sufficient length ($JWT_LENGTH chars)"
    fi
fi

# Check for common security issues
if [ -f ".env" ] && grep -q "password\|secret\|key" .env; then
    if git ls-files .env >/dev/null 2>&1; then
        print_status "ERROR" ".env file is tracked by git - this exposes secrets!"
    else
        print_status "SUCCESS" ".env file is not tracked by git"
    fi
fi

echo ""
echo "📊 Summary"
echo "=========="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_status "SUCCESS" "All checks passed! Ready for deployment 🎉"
elif [ $ERRORS -eq 0 ]; then
    print_status "WARNING" "Ready for deployment with $WARNINGS warnings"
    echo ""
    echo "💡 Recommendations:"
    echo "   - Review warnings above"
    echo "   - Test thoroughly before production deployment"
else
    print_status "ERROR" "Deployment not ready - $ERRORS errors, $WARNINGS warnings"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Fix all errors listed above"
    echo "   2. Check DEPLOYMENT_CHECKLIST.md for detailed instructions"
    echo "   3. Run this script again to verify fixes"
    echo "   4. If using Firebase, see FIREBASE_SETUP_GUIDE.md"
fi

echo ""
echo "📚 Helpful Resources:"
echo "   - Environment setup: .env.example"
echo "   - Deployment guide: DEPLOYMENT_CHECKLIST.md"
echo "   - Firebase setup: FIREBASE_SETUP_GUIDE.md"
echo "   - Health check: http://localhost:5000/api/health/detailed"

exit $ERRORS