# CredNXT - P2P Lending Platform

## Project Overview
CredNXT is an advanced P2KP (Peer-to-Known-Person) lending platform revolutionizing social lending through a mobile-first, user-centric approach tailored to the Indian financial ecosystem.

## Technology Stack
- **Frontend**: React with TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with banking-grade security
- **Real-time**: WebSocket connections
- **Payments**: UPI integration ready

## Recent Changes

### August 13, 2025 - Payment System Fixes

#### 1. Payment Acceptance Workflow Fix
**Issue**: Payments were automatically approved bypassing lender review
**Solution**: 
- Removed auto-approval logic from submit-payment endpoint
- All payments now require explicit lender approval
- Proper notification system for payment submissions
- Installment advancement only happens after approval

#### 2. Outstanding Calculations Fix
**Issue**: Complex and incorrect outstanding amount calculations
**Solution**:
- Simplified outstanding calculation: `Total Loan Amount - Total Paid`
- Clear separation of Outstanding Principal vs Total Outstanding
- Proper handling of different repayment types (EMI, interest-only, full payment)
- Accurate due/overdue amount tracking

#### 3. Code Quality Improvements
- Fixed duplicate function declarations
- Corrected variable naming inconsistencies
- Improved error handling and user feedback

## Payment Workflow (Current)
1. **Submit Payment**: Borrower submits → Status: "Pending"
2. **Notification**: Lender receives notification
3. **Review**: Lender sees approve/reject buttons
4. **Decision**: Lender approves/rejects → Status: "Paid"/"Rejected"
5. **Advancement**: System advances installment only after approval

## User Preferences
- **Communication**: Simple, everyday language for non-technical users
- **Code Style**: Banking industry compliance standards
- **Error Handling**: Comprehensive logging and user-friendly messages

## Architecture Decisions
- **Security First**: Banking-grade authentication and audit trails
- **Mobile First**: Responsive design optimized for mobile users
- **Compliance**: RBI guidelines and banking standards
- **Real-time**: WebSocket for instant notifications

## Database Schema
- **Users**: Authentication and profile management
- **Offers**: Loan offers with comprehensive terms
- **Payments**: Payment tracking with approval workflow
- **Notifications**: Multi-channel notification system
- **Audit**: Compliance and security logging