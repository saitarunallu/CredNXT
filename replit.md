# CredNXT - P2P Lending Platform

## Overview
CredNXT is an advanced P2KP (Peer-to-Known-Person) lending platform designed for the Indian financial ecosystem. It aims to revolutionize social lending with a mobile-first, user-centric approach. The platform's core capabilities include comprehensive loan offer creation, automated repayment scheduling, a robust payment approval workflow, and real-time notifications, all built with banking-grade security and compliance with RBI guidelines. It supports flexible repayment frequencies (weekly, bi-weekly, monthly, quarterly, semi-annual, yearly) and provides clear visual indicators for money lent versus borrowed.

## User Preferences
- **Communication**: Simple, everyday language for non-technical users
- **Code Style**: Banking industry compliance standards
- **Error Handling**: Comprehensive logging and user-friendly messages

## System Architecture
The platform follows a mobile-first, security-first, and cloud-ready architectural approach.
- **UI/UX**: Features a modern, compact card design with clean typography and proper spacing. It utilizes a consistent light blue background (`#e1edfd`) with white headers for contrast. Visual indicators like directional arrow badges and color-coded financial perspectives (Green for lent, Orange for owed) provide instant recognition. The design is responsive, WCAG 2.1 compliant with enhanced accessibility features, and includes smooth page transitions, loading states, and skeleton screens for a premium user experience.
- **Technical Implementations**:
    - **Frontend**: React with TypeScript, Vite, and Tailwind CSS.
    - **Backend**: Express.js with TypeScript.
    - **Database**: PostgreSQL with Drizzle ORM.
    - **Authentication**: JWT with banking-grade security.
    - **Real-time**: WebSocket connections for instant notifications.
    - **Payment Workflow**: Implements a robust payment validation system ensuring compliance with repayment schedules, preventing multiple pending payments unless explicitly allowed, and automatically advancing due dates upon payment approval.
    - **Code Quality**: Adheres to banking industry compliance standards, includes comprehensive error boundaries, network error handling, and a sophisticated testing infrastructure using Vitest and React Testing Library with 70% coverage thresholds.
- **System Design Choices**:
    - **Security First**: Emphasizes banking-grade authentication, audit trails, and security hardening.
    - **Compliance**: Designed to adhere to RBI guidelines and banking standards.
    - **Cloud Ready**: Built for cloud-native deployment with a focus on AWS infrastructure (VPC, ECS Fargate, RDS, ALB) and Render.com integration.
    - **Infrastructure as Code**: Utilizes CloudFormation templates and `render.yaml` blueprints for reproducible deployments and automated environment configuration.
    - **Container First**: Leverages Docker containerization with multi-stage builds and non-root users for enhanced security.
    - **Monitoring**: Integrates comprehensive health checks (`/api/health`, `/api/ready`, `/api/live`, `/api/health/detailed`) and CloudWatch for metrics and alerting.
    - **Database Schema**: Includes core entities like Users, Offers, Payments, Notifications, and Audit for robust functionality and compliance.

## External Dependencies
- **Payment Gateways**: UPI integration ready.
- **Cloud Providers**:
    - AWS (ECS Fargate, RDS PostgreSQL, Application Load Balancer, CloudFormation, Secrets Manager, CloudWatch).
    - Render.com (for automated deployment and hosting).

## Recent Updates

### August 14, 2025 - SMS Service Restricted to Authentication Only
**Restriction**: Limited SMS functionality to authentication purposes only
**Implementation**: Removed transaction-related messaging and kept only login/password reset
- Removed loan offer notifications, payment reminders, and transaction messages
- Updated SMS service to only support `sendVerificationCode` and `sendPasswordResetCode` methods
- Updated API routes to remove `/loan-offer` and `/payment-reminder` endpoints
- Added `/send-password-reset` endpoint for password reset codes
- Updated frontend SMS test interface to only show verification and password reset templates
- Updated message type validation to only accept 'verification' type
- Updated documentation and test page to reflect authentication-only usage

### August 14, 2025 - SMS Service Migrated to Firebase  
**Migration**: Replaced Twilio SMS with Google Firebase integration
**Implementation**: Updated SMS service to use Firebase Admin SDK and Firestore
- Updated `server/services/sms.ts` to use Firebase Admin SDK instead of Twilio
- Messages are now logged to Firestore collection 'sms_messages' for tracking
- Updated environment variables to use Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
- Modified `server/routes/sms.ts` error messages to reflect Firebase usage
- Updated `SMS_INTEGRATION.md` documentation with Firebase setup instructions
- Updated SMS test page to show Firebase configuration requirements

### August 14, 2025 - SMS Integration Complete (Legacy)
**Feature Added**: Comprehensive SMS functionality originally using Twilio
**Implementation**: Full SMS service for notifications, verification, and alerts
- Created `server/services/sms.ts` with SMS integration and message templates
- Added `server/routes/sms.ts` with authenticated API endpoints for SMS operations
- Built `client/src/components/sms/sms-test.tsx` testing interface with templates
- Implemented `client/src/lib/sms.ts` frontend service for API communication
- Added SMS test page accessible via Profile > SMS Test (Dev)
- Integrated with existing authentication middleware and notification system
- Supports verification codes, loan offers, payment reminders, and custom messages

### August 14, 2025 - Render Deployment Fix
**Issue Resolved**: ERR_MODULE_NOT_FOUND for '@vitejs/plugin-react' in production
**Solution**: Created separate production build process excluding dev dependencies
- Added `server/index.prod.ts` for production-only server entry
- Implemented `build-client.sh` and `build-server.sh` for separated builds
- Updated deployment to use `node dist/index.prod.js` instead of npm start
- Added production build testing with `test-production-build.sh`