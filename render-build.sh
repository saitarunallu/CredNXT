#!/bin/bash

# Render.com build script for CredNXT
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the frontend first
echo "Building frontend..."
./build-client.sh

# Build the backend with proper exclusions
echo "Building backend..."
./build-server.sh

# Run database migration if needed
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npm run db:push
else
  echo "DATABASE_URL not set, skipping migrations"
fi

echo "Build completed successfully!"