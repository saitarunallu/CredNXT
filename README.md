# CredNXT - P2P Lending Platform

[![CI/CD](https://github.com/crednxt/crednxt/workflows/CI/badge.svg)](https://github.com/crednxt/crednxt/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CredNXT is an advanced P2KP (Peer-to-Known-Person) lending platform revolutionizing social lending through a mobile-first, user-centric approach tailored to the Indian financial ecosystem.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/crednxt.git
   cd crednxt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and secrets
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🏗️ Technology Stack

### Frontend
- **React 18** with TypeScript - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Framer Motion** - Smooth animations

### Backend
- **Express.js** with TypeScript - Web framework
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Robust relational database
- **JWT** - Secure authentication
- **WebSocket** - Real-time notifications
- **Passport.js** - Authentication middleware

### DevOps & Quality
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Vitest** - Unit and integration testing
- **ESLint & Prettier** - Code quality
- **Health Checks** - Monitoring endpoints

## 🎯 Key Features

### 📱 Mobile-First Design
- Responsive layout optimized for mobile devices
- Progressive Web App (PWA) capabilities
- Touch-friendly interfaces and gestures
- Offline-first functionality

### 🔐 Banking-Grade Security
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- CSRF protection and security headers
- Audit trails for all financial transactions
- Role-based access control

### 💰 Comprehensive Loan Management
- **Flexible Loan Terms**: Support for EMI, interest-only, and lump-sum payments
- **Multiple Frequencies**: Weekly, bi-weekly, monthly, quarterly, semi-annual, yearly
- **Dynamic Calculations**: Real-time interest and payment calculations
- **Payment Tracking**: Detailed payment history and scheduling
- **Due Date Management**: Automated reminders and overdue tracking

### 🔔 Real-Time Notifications
- WebSocket-based instant notifications
- Multi-channel delivery (in-app, email ready)
- Smart notification preferences
- Payment reminders and status updates

### 📊 Analytics Dashboard
- Portfolio overview with key metrics
- Payment tracking and trends
- Risk assessment indicators
- Export functionality for reports

### 🎨 Enhanced User Experience
- Smooth animations and transitions
- Loading states and skeleton screens
- Error boundaries with fallback UI
- Accessibility compliance (WCAG 2.1)
- Dark mode support

## 🚀 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database GUI)

# Testing
npm run test         # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Lint TypeScript files
npm run type-check   # Type check without building
```

### Project Structure

```
crednxt/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components and routing
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and configurations
│   │   └── test/           # Test files and utilities
│   └── index.html
├── server/                 # Backend Express application
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── db.ts              # Database connection
│   ├── index.ts           # Server entry point
│   └── storage.ts         # Data access layer
├── shared/                 # Shared TypeScript types and utilities
│   ├── schema.ts          # Database schema and types
│   └── calculations.ts    # Financial calculations
├── contracts/             # PDF contract storage
├── kfs/                   # KFS document storage
├── schedules/             # Payment schedule storage
└── docs/                  # Additional documentation
```

## 🏃‍♂️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Offers
- `GET /api/offers` - List all offers
- `POST /api/offers` - Create new offer
- `GET /api/offers/:id` - Get offer details
- `PATCH /api/offers/:id/accept` - Accept offer
- `PATCH /api/offers/:id/reject` - Reject offer

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Submit payment
- `PATCH /api/payments/:id/approve` - Approve payment
- `PATCH /api/payments/:id/reject` - Reject payment

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status
- `GET /api/ready` - Readiness probe
- `GET /api/live` - Liveness probe

## 🧪 Testing

The project includes comprehensive testing setup:

### Unit Tests
```bash
npm run test                    # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Generate coverage report
```

### Integration Tests
- API endpoint testing
- Database integration tests
- Authentication flow tests

### Frontend Tests
- Component rendering tests
- User interaction tests
- Error boundary tests
- Hook behavior tests

### Test Structure
```
client/src/test/
├── components/           # Component tests
├── hooks/               # Hook tests
├── pages/               # Page integration tests
├── utils/               # Testing utilities
└── setup.ts            # Test configuration
```

## 🐳 Deployment

### Docker Deployment

1. **Build Docker image**
   ```bash
   docker build -t crednxt:latest .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Environment Variables

Required environment variables for production:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Session
SESSION_SECRET=your-session-secret

# Optional: External Services
EMAIL_SERVICE_API_KEY=your-email-service-key
SMS_SERVICE_API_KEY=your-sms-service-key
```

See `.env.example` for complete configuration options.

### Health Checks

The application provides health check endpoints for monitoring:

- **Basic Health**: `GET /api/health`
- **Detailed Status**: `GET /api/health/detailed`
- **Readiness**: `GET /api/ready`
- **Liveness**: `GET /api/live`

## 🔧 Configuration

### Database Schema

The application uses Drizzle ORM with PostgreSQL. Schema is defined in `shared/schema.ts` and includes:

- **Users**: Authentication and profile data
- **Offers**: Loan offers with terms and conditions
- **Payments**: Payment tracking and history
- **Notifications**: Multi-channel notification system
- **Audit Logs**: Security and compliance tracking

### Security Features

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control
- **Data Protection**: Input validation and sanitization
- **Audit Trails**: Comprehensive logging of financial transactions
- **Rate Limiting**: API rate limiting for security
- **CORS**: Configured for production domains

## 🎨 UI/UX Features

### Design System
- Consistent color palette and typography
- Reusable component library
- Responsive breakpoints for all devices
- Accessibility-first approach

### Animations
- Smooth page transitions
- Loading state animations
- Micro-interactions for better UX
- Reduced motion support for accessibility

### Performance
- Lazy loading for route components
- Image optimization and compression
- Bundle splitting for faster loads
- Service worker for offline functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use conventional commit messages
- Write tests for new features
- Update documentation for API changes
- Ensure mobile-first responsive design

## 📚 Additional Resources

- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Guidelines](./docs/security.md)
- [Contributing Guide](./docs/contributing.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@crednxt.com or create an issue in the GitHub repository.

---

**Built with ❤️ for the Indian fintech ecosystem**