# CredNXT - Peer-to-Known-Person Lending Platform

## Overview

CredNXT is a peer-to-known-person (P2KP) lending platform designed to formalize and secure financial agreements between trusted individuals. It offers automated contract generation, transparent payment tracking, and reminder systems. The platform focuses on preserving relationships while protecting financial interests through a secure and user-friendly interface. It features OTP-based authentication, comprehensive offer management, and real-time notifications. The project aims to provide legally-backed lending solutions with a focus on ease of use and compliance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite build tool)
- **UI Library**: Shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS (custom design system, CSS variables)
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **Authentication**: JWT-based (localStorage persistence)
- **UI/UX Decisions**: Clean, professional light theme with optimized readability and modern design standards. Removed dark mode functionality completely for simplified user experience. Enhanced visual hierarchy (WCAG compliant), refined gradients and animations, smooth transitions, and consistent component styling. Streamlined form design for repayment types (EMI, interest-only, full payment), simplified tenure (months, years), reduced repayment frequencies (monthly, yearly), and standardized monthly compounding.

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ES modules)
- **Framework**: Express.js (REST API endpoints)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSocket server
- **Session Management**: JWT tokens with phone-based OTP authentication
- **File Serving**: Static files

### Database Design
- **ORM**: Drizzle with PostgreSQL
- **Schema**: Users (phone-based auth), Offers (lending terms), Payments (tracking), Notifications, OTP codes.
- **Relationships**: Foreign key constraints with cascade delete.

### Authentication & Security
- **Primary Authentication**: OTP-based login (phone numbers)
- **Session Management**: JWT tokens (30-day expiration)
- **Token Storage**: Client-side localStorage
- **Route Protection**: AuthGuard component
- **Banking-Grade Security**: Multi-layer validation (input sanitization, XSS, SQL injection prevention), advanced rate limiting, threat detection, IP blacklisting, security audit trails. Multi-factor authentication, enhanced JWT validation, role-based access control, mandatory phone verification.

### Notification System
- **Real-time Updates**: WebSocket connections
- **Email/SMS**: Configurable integrations (SendGrid, Twilio ready)
- **Reminder Automation**: Scheduled notifications (T-7, T-3, T-1, due date, overdue)

### File Storage & Contract Generation
- **PDF Generation**: PDFKit for legally-formatted lending agreements (automatic generation)
- **Storage Strategy**: S3-compatible storage (MinIO for dev, AWS S3 for prod)
- **Document Management**: Automated contract generation and secure storage.

### Banking Standard Compliance
- **Calculation System**: Rebuilt loan calculation engine following RBI guidelines (reducing balance EMI, APR, effective interest rate, 2-decimal precision). Supports EMI, interest-only, full payment.
- **Payment Validation**: Strict EMI installment tracking (sequential, exact amount validation), partial payment handling. Repayment schedule-based system with visual status indicators and clear guidance.
- **Regulatory Compliance**: Interest rate limits (max 50% APR), loan amount validation (max ₹10L), KYC requirements (phone verification, identity validation), payment security.
- **Transaction Monitoring**: Real-time validation against compliance rules, fraud detection, pre-transaction checks, audit logging.
- **API Security**: Enhanced input validation, request authentication with pattern analysis, banking-standard error handling, advanced rate limiting.

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL connectivity
- **drizzle-orm & drizzle-kit**: ORM and migrations
- **express**: Web server
- **jsonwebtoken**: JWT handling
- **ws**: WebSocket server

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@hookform/resolvers**: Form validation
- **wouter**: Routing
- **react-hook-form**: Form management
- **zod**: Schema validation

### UI Component System
- **@radix-ui/***: UI primitives
- **tailwindcss**: CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icons

### Development & Build Tools
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **tsx**: TypeScript execution
- **esbuild**: JavaScript bundler

### Integrated Services
- **Twilio**: SMS and OTP verification
- **SendGrid**: Email notifications
- **AWS S3/MinIO**: File storage