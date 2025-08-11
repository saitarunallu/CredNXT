# CredNXT - Peer-to-Known-Person Lending Platform

## Overview

CredNXT is a peer-to-known-person (P2KP) lending platform that revolutionizes financial agreements between friends, family, and trusted contacts. The platform provides secure, transparent, and legally-backed lending solutions with automated contract generation, payment tracking, and reminder systems. Built with modern web technologies, it features OTP-based authentication, comprehensive offer management, and real-time notifications to preserve relationships while protecting financial interests.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Contact System Removal (August 2025)
- **Removed contact list functionality entirely** - The app no longer maintains separate contact lists
- **Direct user-to-user offers** - Mobile numbers are now used to send offers directly to registered users or unregistered recipients
- **Automatic user detection** - When entering a mobile number, the app checks if the user is registered and auto-fills their name
- **Updated database schema** - Offers table now stores recipient phone/name directly instead of referencing contacts table
- **Simplified UX** - Phone number entry comes first, followed by name field that auto-fills or allows manual entry
- **Fixed authentication** - JWT tokens now properly included in all API requests for seamless user lookup

### Enhanced Tenure and Repayment Options (August 2025)
- **Added "Years" to tenure units** - Users can now specify loan tenure in days, weeks, months, or years
- **Added repayment frequency selection** - For EMI and interest-only payments, users can choose weekly, monthly, or yearly frequency
- **Smart conditional UI** - Repayment frequency selector only appears when EMI or interest-only repayment types are selected
- **Improved form validation** - Fixed type coercion for amount, interest rate, and tenure value fields

### Functional PDF Contract System (August 2025)
- **Professional PDF generation** - Implemented PDFKit library for creating legally-formatted lending agreements
- **Automatic contract creation** - PDF contracts are generated automatically when offers are created
- **On-demand generation** - System generates contracts for existing offers when downloading if missing
- **Comprehensive contract content** - Includes party details, loan terms, legal conditions, and signature sections
- **Secure file storage** - Contracts stored locally with proper file management and access controls

### Enhanced Real-time Updates System (August 2025)
- **WebSocket-based notifications** - Instant real-time updates when offers, payments, or notifications change
- **Automatic cache invalidation** - React Query cache refreshes immediately when WebSocket events arrive
- **Background polling** - Data refreshes every 15 seconds as a backup mechanism
- **Multi-user support** - Notifications sent to both offer creators and recipients when connected
- **Comprehensive event handling** - Covers offer creation, acceptance, payment recording, and status changes

### EMI Payment Validation System (August 2025)
- **Strict EMI installment tracking** - System tracks individual EMI payments and prevents multiple submissions
- **Exact amount validation** - EMI payments must be exactly the calculated EMI amount (no overpayments or underpayments)
- **Installment progression** - Users can only pay one EMI at a time in sequential order (EMI #1, then #2, etc.)
- **Enhanced error messaging** - Clear feedback showing which EMI installment is due and expected amount
- **Client and server validation** - Dual-layer validation prevents invalid payments on both frontend and backend
- **Partial payment handling** - If partial EMI payment exists, system requires completion before next EMI

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and CSS variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation schemas
- **Authentication**: JWT-based with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with TypeScript using ES modules
- **Framework**: Express.js for REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket server for live notifications
- **Session Management**: JWT tokens with phone-based OTP authentication
- **File Serving**: Vite middleware for development, static files for production

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Structure**:
  - Users with phone-based authentication
  - Contacts management for known circles
  - Offers with comprehensive lending terms
  - Payments tracking with partial payment support
  - Notifications system for automated reminders
  - OTP codes for secure authentication
- **Data Types**: Enums for offer types, statuses, and payment methods
- **Relationships**: Foreign key constraints with cascade delete policies

### Authentication & Security
- **Primary Authentication**: OTP-based login using phone numbers
- **Session Management**: JWT tokens with 30-day expiration
- **Token Storage**: Client-side localStorage with automatic cleanup
- **Route Protection**: AuthGuard component for protected routes
- **Password Security**: PBKDF2 hashing with salt (for future password features)

### Notification System
- **Real-time Updates**: WebSocket connections for instant notifications
- **Email Integration**: Configurable email service (SendGrid ready)
- **SMS Integration**: Configurable SMS service (Twilio ready)
- **Reminder Automation**: Scheduled notifications at T-7, T-3, T-1, due date, and overdue
- **Development Mode**: Console logging for email/SMS in development

### File Storage & Contract Generation
- **PDF Generation**: Service layer for legal contract creation
- **Storage Strategy**: S3-compatible storage (MinIO for development, AWS S3 for production)
- **Document Management**: Automated contract generation and secure storage
- **Download System**: Secure file retrieval with access controls

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm & drizzle-kit**: Type-safe database ORM and migrations
- **express**: Web server framework
- **jsonwebtoken**: JWT token generation and verification
- **ws**: WebSocket server implementation

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@hookform/resolvers**: Form validation integration
- **wouter**: Lightweight React routing
- **react-hook-form**: Form management and validation
- **zod**: Schema validation and type safety

### UI Component System
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development & Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds

### Planned Integrations
- **Twilio**: SMS and OTP verification services
- **SendGrid**: Email notification services
- **AWS S3/MinIO**: File storage for contracts and documents
- **Redis + BullMQ**: Job queue for scheduled reminders (future enhancement)

### Security & Monitoring
- **connect-pg-simple**: PostgreSQL session store
- **Replit plugins**: Development environment integration
- **Runtime error handling**: Custom error modal for development