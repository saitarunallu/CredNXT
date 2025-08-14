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

### August 14, 2025 - SMS Integration Complete
**Feature Added**: Comprehensive SMS functionality using Twilio
**Implementation**: Full SMS service for notifications, verification, and alerts
- Created `server/services/sms.ts` with Twilio integration and message templates
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