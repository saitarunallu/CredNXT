#!/usr/bin/env node

// Parse Firebase config JSON and create environment variables
const fs = require('fs');
const crypto = require('crypto');

// Get Firebase config from environment variable
const firebaseConfigJson = process.env.FIREBASE_CONFIG_JSON;

if (!firebaseConfigJson) {
  console.error('❌ FIREBASE_CONFIG_JSON environment variable not found');
  process.exit(1);
}

try {
  // Parse the Firebase service account JSON
  const firebaseConfig = JSON.parse(firebaseConfigJson);
  
  // Generate a secure JWT secret
  const jwtSecret = crypto.randomBytes(32).toString('base64');
  
  // Extract backend configuration
  const backendConfig = {
    JWT_SECRET: jwtSecret,
    FIREBASE_PROJECT_ID: firebaseConfig.project_id,
    FIREBASE_PRIVATE_KEY: firebaseConfig.private_key,
    FIREBASE_CLIENT_EMAIL: firebaseConfig.client_email
  };
  
  // Create frontend configuration based on project ID
  const frontendConfig = {
    VITE_FIREBASE_API_KEY: 'AIzaSyCqXPlBiM9b4tY8nGqL2oCKkP5rJ7dE2wF', // This needs to be the actual web API key
    VITE_FIREBASE_AUTH_DOMAIN: `${firebaseConfig.project_id}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: firebaseConfig.project_id,
    VITE_FIREBASE_STORAGE_BUCKET: `${firebaseConfig.project_id}.appspot.com`,
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012', // This needs to be actual sender ID
    VITE_FIREBASE_APP_ID: '1:123456789012:web:abcdef1234567890', // This needs to be actual app ID
    VITE_FIREBASE_USE_PRODUCTION: 'true'
  };
  
  // Create .env content
  const envContent = `# CredNXT Environment Variables - Auto-generated from Firebase Config JSON
# Generated on ${new Date().toISOString()}

# ================================
# JWT CONFIGURATION
# ================================
JWT_SECRET=${backendConfig.JWT_SECRET}

# ================================
# FIREBASE BACKEND CONFIGURATION 
# ================================
FIREBASE_PROJECT_ID=${backendConfig.FIREBASE_PROJECT_ID}
FIREBASE_PRIVATE_KEY="${backendConfig.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\\n')}"
FIREBASE_CLIENT_EMAIL=${backendConfig.FIREBASE_CLIENT_EMAIL}

# ================================
# FIREBASE FRONTEND CONFIGURATION
# ================================
# Note: Web API key and other frontend configs need to be obtained from Firebase Console
# These are placeholder values - update with actual values from your Firebase project
VITE_FIREBASE_API_KEY=${frontendConfig.VITE_FIREBASE_API_KEY}
VITE_FIREBASE_AUTH_DOMAIN=${frontendConfig.VITE_FIREBASE_AUTH_DOMAIN}
VITE_FIREBASE_PROJECT_ID=${frontendConfig.VITE_FIREBASE_PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${frontendConfig.VITE_FIREBASE_STORAGE_BUCKET}
VITE_FIREBASE_MESSAGING_SENDER_ID=${frontendConfig.VITE_FIREBASE_MESSAGING_SENDER_ID}
VITE_FIREBASE_APP_ID=${frontendConfig.VITE_FIREBASE_APP_ID}

# ================================
# DEPLOYMENT CONFIGURATION
# ================================
NODE_ENV=development
VITE_FIREBASE_USE_PRODUCTION=true
`;

  console.log('✅ Successfully parsed Firebase configuration');
  console.log('📋 Extracted configuration:');
  console.log(`   Project ID: ${backendConfig.FIREBASE_PROJECT_ID}`);
  console.log(`   Client Email: ${backendConfig.FIREBASE_CLIENT_EMAIL}`);
  console.log(`   Generated JWT Secret: ${jwtSecret.substring(0, 16)}...`);
  
  // Export as environment variables for current process
  Object.assign(process.env, backendConfig, frontendConfig);
  
  console.log('🚀 Environment variables set for current session');
  console.log('⚠️  Note: Frontend API key needs to be updated with actual web config from Firebase Console');
  
} catch (error) {
  console.error('❌ Error parsing Firebase configuration:', error);
  process.exit(1);
}