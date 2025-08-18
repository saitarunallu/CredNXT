# CredNXT - P2P Lending Platform

## Overview
CredNXT is an advanced P2KP (Peer-to-Known-Person) lending platform for the Indian financial ecosystem. It aims to revolutionize social lending with a mobile-first, user-centric approach, offering comprehensive loan offer creation, automated repayment scheduling, robust payment approval workflows, and real-time notifications. The platform emphasizes banking-grade security and compliance with RBI guidelines, supporting flexible repayment frequencies and providing clear visual indicators for financial positions.

## User Preferences
- **Communication**: Simple, everyday language for non-technical users
- **Code Style**: Banking industry compliance standards
- **Error Handling**: Comprehensive logging and user-friendly messages

## System Architecture
The platform follows a mobile-first, security-first, and cloud-ready architectural approach.
- **UI/UX**: Features a modern, compact card design with clean typography, consistent light blue background (`#e1edfd`), and white headers. Visual indicators like directional arrow badges and color-coded financial perspectives (Green for lent, Orange for owed) are used for instant recognition. The design is responsive, WCAG 2.1 compliant, and includes smooth page transitions, loading states, and skeleton screens.
- **Technical Implementations**:
    - **Frontend**: React with TypeScript, Vite, and Tailwind CSS.
    - **Backend**: Express.js with TypeScript.
    - **Database**: PostgreSQL with Drizzle ORM (though Firebase Firestore is now the primary data store).
    - **Authentication**: Firebase Authentication.
    - **Real-time**: WebSocket connections for instant notifications.
    - **Payment Workflow**: Implements a robust payment validation system ensuring compliance with repayment schedules and automatic due date advancement upon payment approval.
    - **Code Quality**: Adheres to banking industry compliance standards, includes comprehensive error boundaries, network error handling, and a sophisticated testing infrastructure using Vitest and React Testing Library with 70% coverage thresholds.
    - **Notification System**: Purely in-app notifications; SMS for Firebase Auth OTP only.
    - **Calculation Engine**: Universal calculation engine for repayment schedules supporting all offer types and repayment frequencies (weekly, bi-weekly, monthly, quarterly, half-yearly, yearly).
- **System Design Choices**:
    - **Security First**: Emphasizes banking-grade authentication, audit trails, and security hardening.
    - **Compliance**: Designed to adhere to RBI guidelines and banking standards.
    - **Cloud Ready**: Built for cloud-native deployment.
    - **Firebase First**: Utilizes Firebase services for authentication, Firestore database, hosting, and functions.
    - **Monitoring**: Integrates comprehensive health checks (`/api/health`, `/api/ready`, `/api/live`, `/api/health/detailed`) for application monitoring.
    - **Database Schema**: Includes core entities like Users, Offers, Payments, Notifications, and Audit for robust functionality and compliance, primarily managed within Firestore.
    - **Unified Data Access Layer**: Single source of truth for all database operations with automatic environment detection (API vs. direct Firestore) and consistent data normalization.
    - **PDF Generation**: Backend functionality for generating contract, KFS (Key Fact Statement), and schedule PDFs.

## External Dependencies
- **Payment Gateways**: UPI integration ready.
- **Cloud Providers**: Firebase (Authentication, Firestore, Hosting, Functions).