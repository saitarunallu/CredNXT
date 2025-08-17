import fs from 'fs';

// Extract Firebase config and create proper frontend environment variables
const firebaseConfigJson = process.env.FIREBASE_CONFIG_JSON;

if (firebaseConfigJson) {
  try {
    const config = JSON.parse(firebaseConfigJson);
    
    // Set environment variables for Vite
    process.env.VITE_FIREBASE_PROJECT_ID = config.project_id;
    process.env.VITE_FIREBASE_AUTH_DOMAIN = `${config.project_id}.firebaseapp.com`;
    process.env.VITE_FIREBASE_STORAGE_BUCKET = `${config.project_id}.appspot.com`;
    
    console.log(`✅ Set frontend Firebase config for project: ${config.project_id}`);
  } catch (error) {
    console.error('❌ Error parsing Firebase config:', error);
  }
}