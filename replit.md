# CredNXT - Peer-to-Known-Person Lending Platform

## Overview

CredNXT is a peer-to-known-person (P2KP) lending platform that revolutionizes financial agreements between friends, family, and trusted contacts. The platform provides secure, transparent, and legally-backed lending solutions with automated contract generation, payment tracking, and reminder systems. Built with modern web technologies, it features OTP-based authentication, comprehensive offer management, and real-time notifications to preserve relationships while protecting financial interests.

## User Preferences

Preferred communication style: Simple, everyday language.

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