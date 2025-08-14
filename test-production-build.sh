#!/bin/bash

echo "🧪 Testing Production Build..."

# Set production environment
export NODE_ENV=production
export DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5432/test}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-production-build-test}"
export SESSION_SECRET="${SESSION_SECRET:-test-session-secret-for-production-build-test}"
export PORT=8080

# Build the application
echo "Building application..."
./build-client.sh
./build-server.sh

# Check if builds completed successfully
if [ ! -f "dist/index.prod.js" ]; then
    echo "❌ Server build failed - dist/index.prod.js not found"
    exit 1
fi

if [ ! -f "dist/public/index.html" ]; then
    echo "❌ Client build failed - dist/public/index.html not found"
    exit 1
fi

echo "✅ Production build completed successfully"

# Test the production server startup
echo "Testing production server startup..."
timeout 10s node dist/index.prod.js > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "✅ Production server started and health check passed"
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ Production server failed to start or health check failed"
    echo "Server logs:"
    cat /tmp/server.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "🎉 Production build test completed successfully!"