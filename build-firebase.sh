#!/bin/bash
set -e

echo "Building for Firebase hosting..."

# Build the client using Vite
echo "Building client with Vite..."
vite build

# The build output should go to dist/public (Vite config), but we need it in dist/client for Firebase
echo "Ensuring proper directory structure for Firebase hosting..."
mkdir -p dist/client

# Copy the build output to Firebase hosting directory if needed
if [ -d "dist/public" ]; then
    echo "Copying from dist/public to dist/client..."
    cp -r dist/public/* dist/client/
fi

echo "Firebase build complete!"
echo "Deploy with: firebase deploy"