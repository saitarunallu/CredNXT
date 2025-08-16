# CredNXT Deployment Checklist

## Pre-Deployment Requirements

### 1. Firebase Project Setup
- [ ] Create Firebase project at https://console.firebase.google.com/
- [ ] Enable Authentication > Sign-in method > Phone
- [ ] Create Firestore database in production mode
- [ ] Set up Firestore security rules (see `firestore.rules`)
- [ ] Generate service account key for backend
- [ ] Get web app configuration for frontend

### 2. Environment Variables Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Set secure `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Configure Firebase backend variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
- [ ] Configure Firebase frontend variables (VITE_FIREBASE_*)
- [ ] Set production `FRONTEND_URL` for CORS

### 3. Domain Authorization
- [ ] Add deployment domain to Firebase Console > Authentication > Settings > Authorized domains
- [ ] Wait 5-10 minutes for domain authorization to propagate
- [ ] Test phone authentication after domain authorization

### 4. Build Process Verification
- [ ] Run `npm run build` successfully
- [ ] Verify `dist/` directory contains both frontend and backend builds
- [ ] Test production build locally with `npm start`

### 5. Security Configuration
- [ ] Use secure JWT secret (not default)
- [ ] Configure proper CORS origins
- [ ] Review Firestore security rules
- [ ] Enable audit logging in production

## Platform-Specific Deployment

### Replit Deployments
1. Set all environment variables in Secrets tab
2. Ensure `.env` file is NOT committed to git
3. Deploy using the Deploy button
4. Domain will be auto-assigned and needs Firebase authorization

### Firebase Hosting
1. Run `npm run build`
2. Deploy with `firebase deploy --only hosting`
3. Backend needs separate hosting (Cloud Functions, Cloud Run, etc.)

### Other Platforms (Vercel, Netlify, Railway, etc.)
1. Set environment variables in platform dashboard
2. Configure build command: `npm run build`
3. Configure start command: `npm start`
4. Set Node.js version to 18+ if required

## Post-Deployment Verification

### 1. Health Checks
- [ ] `/api/health` returns 200 OK
- [ ] `/api/ready` returns 200 OK with Firebase status
- [ ] `/api/live` returns 200 OK

### 2. Core Functionality
- [ ] Landing page loads without errors
- [ ] Phone authentication works (requires domain authorization)
- [ ] User registration and login flow
- [ ] Create offer functionality
- [ ] Payment processing
- [ ] Dashboard displays correctly

### 3. Firebase Integration
- [ ] Frontend connects to Firebase (no auth/invalid-api-key errors)
- [ ] Backend connects to Firestore (no credentials warnings)
- [ ] Phone OTP sends successfully
- [ ] Data persists in Firestore

### 4. Performance & Security
- [ ] All API endpoints respond within reasonable time
- [ ] No console errors in browser
- [ ] HTTPS enabled
- [ ] Security headers configured

## Common Issues & Solutions

### Firebase Authentication Errors
- **Error**: `auth/invalid-api-key`
  - **Solution**: Check VITE_FIREBASE_API_KEY in environment variables
  
- **Error**: `auth/unauthorized-domain`
  - **Solution**: Add domain to Firebase Console > Authentication > Authorized domains
  
### Backend Connection Issues
- **Error**: "Firebase credentials not configured"
  - **Solution**: Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

### Build Failures
- **Error**: TypeScript compilation errors
  - **Solution**: Run `npm run check` to identify and fix type errors

### Performance Issues
- **Error**: Slow API responses
  - **Solution**: Check Firestore indexes, optimize queries, enable caching

## Emergency Rollback
If deployment fails:
1. Check error logs in platform dashboard
2. Verify all environment variables are set correctly
3. Use platform's rollback feature to previous working version
4. Contact support if Firebase services are down

## Monitoring & Maintenance
- Monitor application logs for errors
- Set up alerts for API endpoint failures
- Regular security updates for dependencies
- Monitor Firebase usage and billing
- Backup Firestore data regularly