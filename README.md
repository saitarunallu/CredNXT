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
1. Configure required secrets in Replit Secrets:
   - `FIREBASE_WEB_API_KEY` - Firebase Web API key for client authentication
   - `FIREBASE_CONFIG_JSON` - Complete Firebase service account JSON for server operations

**Security Note**: This project contains no hardcoded secrets and is safe to remix. All sensitive configuration must be added to Replit Secrets.

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

## 🔄 Remixing This Project

This project is designed for safe remixing with no exposed secrets:

- **No hardcoded API keys or credentials**
- **Complete setup guide**: See `REMIX_GUIDE.md` for step-by-step instructions
- **Security documentation**: Review `SECURITY.md` for best practices
- **Environment templates**: Use `.env.example` for configuration

### Quick Remix Setup
1. Fork/remix this project
2. Create your own Firebase project
3. Configure `FIREBASE_WEB_API_KEY` and `FIREBASE_CONFIG_JSON` in Replit Secrets
4. Run `./deploy.sh`

## 📞 Support

For technical support, setup questions, or licensing inquiries, please refer to the documentation or contact the project maintainers.

---

**© 2025 CredNXT. All Rights Reserved.**