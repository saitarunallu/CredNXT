# CredNXT - P2P Lending Platform

A robust peer-to-peer lending platform that enables secure financial agreements between trusted contacts, with advanced calculation and management capabilities.

## 🌐 Live Application

**Production URL**: [https://crednxt-ef673.web.app](https://crednxt-ef673.web.app)

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
```bash
./deploy-with-service-account.sh
```

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

- All API endpoints require authentication
- Rate limiting implemented
- Input validation on all forms
- Secure financial data handling
- Production-grade Firebase security rules
- Proprietary license - All rights reserved

## 📞 Support

For technical support or licensing inquiries, please contact CredNXT.

---

**© 2025 CredNXT. All Rights Reserved.**