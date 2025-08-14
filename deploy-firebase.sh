#!/bin/bash
set -e

echo "Building and deploying to Firebase..."

# Run the Firebase build
chmod +x build-firebase.sh
./build-firebase.sh

# Deploy to Firebase
echo "Deploying to Firebase..."
firebase deploy

echo "Firebase deployment complete!"