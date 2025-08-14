#!/usr/bin/env node

/**
 * Deployment Verification Script for CredNXT
 * Verifies that all deployment files are properly configured
 */

import fs from 'fs';
import path from 'path';

const checks = {
  files: [
    'render.yaml',
    'Dockerfile',
    '.dockerignore',
    'render-build.sh',
    '.github/workflows/deploy.yml',
    'RENDER_DEPLOYMENT.md',
    '.env.render'
  ],
  healthEndpoints: [
    '/api/health',
    '/api/ready', 
    '/api/live',
    '/api/health/detailed'
  ]
};

console.log('🔍 CredNXT Deployment Verification\n');

// Check required files
console.log('📁 Checking deployment files...');
let allFilesExist = true;

checks.files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('');

// Check health endpoints exist
console.log('🏥 Checking health endpoints...');
const healthRoutes = 'server/routes/health.ts';

if (fs.existsSync(healthRoutes)) {
  const content = fs.readFileSync(healthRoutes, 'utf8');
  
  checks.healthEndpoints.forEach(endpoint => {
    const route = endpoint.replace('/api', '');
    if (content.includes(`'${route}'`) || content.includes(`"${route}"`)) {
      console.log(`✅ ${endpoint}`);
    } else {
      console.log(`❌ ${endpoint} - MISSING`);
      allFilesExist = false;
    }
  });
} else {
  console.log(`❌ ${healthRoutes} - MISSING`);
  allFilesExist = false;
}

console.log('');

// Check package.json scripts
console.log('📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'start', 'check', 'db:push'];

requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`❌ ${script} - MISSING`);
    allFilesExist = false;
  }
});

console.log('');

// Check environment template
console.log('🔧 Checking environment configuration...');
if (fs.existsSync('.env.render')) {
  const envContent = fs.readFileSync('.env.render', 'utf8');
  const requiredVars = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
  
  requiredVars.forEach(envVar => {
    if (envContent.includes(envVar)) {
      console.log(`✅ ${envVar}`);
    } else {
      console.log(`❌ ${envVar} - MISSING from .env.render`);
      allFilesExist = false;
    }
  });
} else {
  console.log('❌ .env.render - MISSING');
  allFilesExist = false;
}

console.log('');

// Final result
if (allFilesExist) {
  console.log('🎉 All deployment files are configured correctly!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Connect your repository to Render.com');
  console.log('3. Render will auto-detect render.yaml and deploy');
  console.log('4. Your app will be live with health checks enabled');
  console.log('');
  console.log('📚 For detailed instructions, see: RENDER_DEPLOYMENT.md');
} else {
  console.log('❌ Some deployment files are missing or misconfigured.');
  console.log('Please check the errors above and fix them before deploying.');
  process.exit(1);
}