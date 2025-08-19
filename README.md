# CredNXT - P2P Lending Platform

A robust peer-to-peer lending platform that enables secure financial agreements between trusted contacts, with advanced calculation and management capabilities.

## 🌐 Live Application

**Production URL**: [https://crednxt-ef673.web.app](https://crednxt-ef673.web.app)

**Deployment Status**: ✅ LIVE (Deployed August 19, 2025)

### Recent Updates
- **Security Enhanced**: Comprehensive security audit completed with XSS prevention, input sanitization, and PDF injection protection
- **Error Handling**: Improved error boundaries and recovery mechanisms
- **Authentication**: Enhanced Firebase authentication with better token management
- **Code Quality**: Consolidated components and improved TypeScript consistency

## ✨ Key Features

### 🔐 Authentication System
- Phone number verification with OTP
- Profile completion flow  
- Secure session management
- Multi-device support

### 💰 Loan Management
- Create and manage loan offers
- Advanced interest calculations (simple/compound)
- Flexible repayment schedules
- Status tracking (pending, accepted, declined)
- Real-time offer updates

### 📄 Document Generation
- Loan agreement contracts (PDF)
- Key Fact Sheet (KFS) generation
- Repayment schedule documents
- Instant PDF downloads
- Digital signatures support

### 🧮 Financial Calculations
- EMI calculations with Indian standards
- Interest computation options
- Payment scheduling
- Currency formatting (INR)

## 🛠️ Technology Stack

- **Frontend**: React (TypeScript), Vite, Tailwind CSS
- **Backend**: Firebase Functions (Express.js)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **PDF Generation**: PDFKit
- **Hosting**: Firebase Hosting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Firebase project with Firestore and Authentication enabled
- Valid Firebase service account credentials

### Environment Setup
1. Configure Firebase environment variables in Replit Secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_APP_ID` 
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_CONFIG_JSON` (service account)

### Development
```bash
npm install
npm run dev
```

### Deployment

**Prerequisites**: Configure `FIREBASE_CONFIG_JSON` in Replit Secrets with your Firebase service account JSON.

```bash
# Quick deployment (recommended)
./deploy.sh

# Full deployment with detailed output
./deploy-with-service-account.sh

# Manual deployment
npm run build
firebase deploy --only hosting,functions --project crednxt-ef673
```

**Current Deployment**: ✅ Live at https://crednxt-ef673.web.app

**Note**: All deployment methods automatically use the `FIREBASE_CONFIG_JSON` secret for authentication. No manual login required.

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Utilities and services
│   │   └── hooks/          # Custom React hooks
├── functions/              # Firebase Functions
├── server/                 # Express server
├── shared/                 # Shared utilities
├── firestore.rules         # Database security rules
└── firebase.json           # Firebase configuration
```

## 🔧 Configuration Files

- `firebase.json` - Firebase hosting and functions config
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Database indexes
- `vite.config.ts` - Frontend build configuration
- `tailwind.config.ts` - UI styling configuration

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔒 Security & Privacy

### Production Security Features
- **XSS Prevention**: Comprehensive input sanitization across all user inputs
- **PDF Security**: Injection attack prevention in document generation
- **Authentication**: Enhanced Firebase token validation and management
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Strict Zod schema validation with detailed error handling
- **WebSocket Security**: Message validation and sanitization
- **Error Boundaries**: Comprehensive error recovery mechanisms
- **Data Protection**: Secure financial data handling with encryption
- **Firebase Rules**: Production-grade Firestore security rules
- **HTTPS Enforcement**: All traffic secured with SSL certificates

### Compliance
- Proprietary license - All rights reserved
- Data protection and privacy standards implemented
- Secure coding practices followed

## 📞 Support

For technical support or licensing inquiries, please contact CredNXT.

---

**© 2025 CredNXT. All Rights Reserved.**