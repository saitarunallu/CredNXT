# CredNXT - P2P Lending Platform

## Overview
A robust peer-to-peer lending platform that enables secure financial agreements between trusted contacts, with advanced calculation and management capabilities. **Successfully deployed to Firebase** using service account authentication.

## Live Application
- **Production URL**: https://crednxt-ef673.web.app
- **Firebase Project**: crednxt-ef673
- **Deployed**: August 18, 2025

## Technology Stack
- **Frontend**: React (TypeScript), Vite build system, Tailwind CSS
- **Backend**: Firebase Functions (Express.js)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **PDF Generation**: PDFKit for loan agreements
- **Hosting**: Firebase Hosting

## Recent Deployment
✅ **Deployed to Firebase** - August 18, 2025
- Successfully used FIREBASE_CONFIG_JSON secret for authentication
- Frontend and Functions deployed successfully
- Live at: https://crednxt-ef673.web.app
- API endpoints: https://api-mzz6re522q-uc.a.run.app (Cloud Run deployment)
- PDF service: https://api-mzz6re522q-uc.a.run.app (integrated with main API)

✅ **PDF System Completely Improved** - August 18, 2025
- **Pre-Generation Strategy**: All PDFs (contract, KFS, repayment schedule) now generated immediately when offer is created
- **Instant Downloads**: Users get immediate downloads instead of waiting for on-demand PDF generation
- **Better Reliability**: No more timeout or generation failures during downloads
- **Firebase Storage Integration**: Cloud storage automatically handles PDF persistence in production
- **Simplified Endpoints**: PDF download routes now simply fetch pre-generated files
- **Enhanced User Experience**: All loan documents ready instantly when user needs them

✅ **PDF Download URL Routing Fixed** - August 18, 2025
- Fixed critical issue where client was adding `/api` prefix to Firebase Functions URLs
- Updated both queryClient.ts and firebase-backend-service.ts for correct production routing
- Firebase Functions deployed at https://api-mzz6re522q-uc.a.run.app expects direct paths (not `/api/path`)
- PDF downloads now use correct endpoint URLs: `/offers/{id}/pdf/contract`, `/offers/{id}/pdf/kfs`, `/offers/{id}/pdf/schedule`
- Enhanced logging shows authentication and API call details for debugging

✅ **Offers Display Issue Fixed** - August 18, 2025
- Resolved authentication user ID matching with Firestore data
- Enhanced phone number matching for cross-referencing offers
- Added comprehensive logging and fallback mechanisms
- Production users can now see their actual offers properly

## Project Architecture

### Frontend Structure
- React SPA with TypeScript
- Component-based architecture with shadcn/ui
- Real-time data sync with Firestore
- Responsive design with Tailwind CSS
- Comprehensive authentication flow

### Backend Services
- **Firebase Functions**: Serverless API endpoints
- **Authentication Service**: Firebase Auth integration
- **PDF Generation**: Contract and schedule generation
- **Notification System**: SMS and push notifications
- **Security**: Rate limiting and validation

### Database Design
- **Users Collection**: Profile and authentication data
- **Offers Collection**: Loan offers and agreements
- **Real-time Updates**: Firestore real-time listeners

## Key Features

### Authentication System
- Phone number verification with OTP
- Profile completion flow
- Secure session management
- Multi-device support

### Loan Management
- Create and manage loan offers
- Advanced interest calculations
- Flexible repayment schedules
- Status tracking (pending, accepted, declined)

### Document Generation
- Loan agreement contracts (PDF)
- Repayment schedule generation
- Digital signatures support
- Downloadable documents

### Financial Calculations
- EMI calculations with Indian standards
- Interest computation (simple/compound)
- Payment scheduling
- Currency formatting (INR)

## User Preferences
- Use simple, everyday language for non-technical users
- Focus on functionality over technical implementation
- Prioritize security and user experience
- Maintain clean, professional interface design

## Development Guidelines
- Follow fullstack_js development pattern
- Minimize backend complexity - keep most logic in frontend
- Use Firebase as primary backend service
- Maintain type safety with TypeScript
- Test all financial calculations thoroughly

## Deployment Process
- **Service Account**: Uses FIREBASE_CONFIG_JSON secret
- **Build Process**: Vite for frontend, TypeScript compilation for functions
- **Deployment Script**: `deploy-with-service-account.sh`
- **Environment**: All secrets managed through Replit environment

## Security Considerations
- All API endpoints require authentication
- Rate limiting implemented
- Input validation on all forms
- Secure financial data handling
- Production-grade Firebase security rules

## Performance Optimizations
- Code splitting for large bundles
- Optimized asset delivery
- CDN hosting via Firebase
- Efficient Firestore queries
- Real-time data synchronization

## Monitoring & Analytics
- Firebase Console for deployment monitoring
- Function execution logs
- User authentication analytics
- Error tracking and reporting