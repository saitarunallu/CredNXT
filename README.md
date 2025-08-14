# CredNXT - P2P Lending Platform

CredNXT is an advanced P2KP (Peer-to-Known-Person) lending platform that revolutionizes social lending through a mobile-first, user-centric approach tailored to the Indian financial ecosystem.

## 🚀 Features

### Core Functionality
- **Peer-to-Peer Lending**: Create and manage lending offers between known individuals
- **Mobile-First Design**: Optimized for mobile devices with responsive design
- **Real-time Notifications**: WebSocket-based real-time updates for all activities
- **Secure Authentication**: JWT-based authentication with banking-grade security
- **Payment Management**: Comprehensive payment tracking with approval workflows
- **Analytics Dashboard**: Detailed insights into lending/borrowing activities

### Financial Features
- **Multiple Repayment Types**: EMI, Interest-only, and Full payment options
- **Flexible Terms**: Weekly, bi-weekly, monthly, quarterly, semi-annual, and yearly repayment frequencies
- **Interest Calculations**: Automatic interest calculations based on terms
- **Payment Schedules**: Automated repayment schedule management
- **Compliance Tracking**: Built-in compliance with financial regulations

### Security & Compliance
- **Banking-Grade Security**: Multi-layer security with audit trails
- **Data Encryption**: End-to-end encryption for sensitive data
- **Compliance Monitoring**: Automated compliance checks and reporting
- **Rate Limiting**: Advanced rate limiting and DDoS protection
- **Security Alerts**: Real-time security monitoring and alerting

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **TanStack Query** for data fetching
- **Wouter** for routing
- **Radix UI** components
- **Framer Motion** for animations

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for database operations
- **WebSocket** for real-time features
- **JWT** for authentication
- **Express Session** for session management

### Infrastructure
- **Docker** containerization
- **AWS ECS** for container orchestration
- **AWS RDS** for managed PostgreSQL
- **AWS ALB** for load balancing
- **CloudFormation** for infrastructure as code

## 📋 Prerequisites

- Node.js 20+ and npm
- PostgreSQL 15+
- Docker (for containerization)
- AWS CLI (for deployment)

## 🏃‍♂️ Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd crednxt
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env.production

# Edit with your configuration
nano .env.production
```

### 3. Database Setup
```bash
# Push database schema
npm run db:push

# Verify database connection
npm run health-check
```

### 4. Development
```bash
# Start development server
npm run dev

# Visit http://localhost:5000
```

## 🚀 AWS Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed and running
- Environment variables configured

### Automated Deployment

1. **Setup Environment**:
```bash
# Generate secure secrets and configure AWS
npm run aws:setup production
```

2. **Deploy to AWS**:
```bash
# Deploy to production
npm run aws:deploy:production

# Or deploy to staging
npm run aws:deploy:staging
```

### Manual Deployment Steps

1. **Configure Environment**:
```bash
./aws/environment-config.sh production
```

2. **Deploy Infrastructure**:
```bash
./aws/deploy.sh production
```

### Deployment Architecture

The deployment creates:
- **VPC** with public/private subnets across 2 AZs
- **Application Load Balancer** for traffic distribution
- **ECS Fargate** cluster for containerized application
- **RDS PostgreSQL** for database
- **CloudWatch** for monitoring and logging
- **Security Groups** with least-privilege access

## 🏗 Project Structure

```
crednxt/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities and configurations
│   │   └── hooks/         # Custom React hooks
├── server/                # Express backend
│   ├── services/          # Business logic services
│   ├── routes/            # API route definitions
│   ├── db.ts              # Database configuration
│   └── storage.ts         # Data access layer
├── shared/                # Shared types and schemas
│   ├── schema.ts          # Database schema and types
│   └── calculations.ts    # Financial calculations
├── aws/                   # AWS deployment configuration
│   ├── cloudformation.yml # Infrastructure template
│   ├── deploy.sh          # Deployment script
│   └── environment-config.sh # Environment setup
├── Dockerfile             # Container definition
├── docker-compose.yml     # Local containerization
└── package.json           # Dependencies and scripts
```

## 🔧 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

### Production
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run health-check` - Health check endpoint test

### AWS Deployment
- `npm run aws:setup` - Configure AWS environment
- `npm run aws:deploy` - Deploy to AWS
- `npm run aws:deploy:staging` - Deploy to staging
- `npm run aws:deploy:production` - Deploy to production

### Docker
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run containerized app locally

## 🔒 Security Features

### Authentication & Authorization
- JWT-based stateless authentication
- Session management with secure cookies
- Role-based access control (RBAC)
- Multi-factor authentication support

### Data Protection
- End-to-end encryption for sensitive data
- Password hashing with bcrypt
- SQL injection protection via parameterized queries
- XSS protection with content security policies

### Monitoring & Compliance
- Comprehensive audit logging
- Real-time security monitoring
- Compliance reporting and tracking
- Automated threat detection

## 📊 Monitoring & Health Checks

### Health Endpoints
- `GET /api/health` - Basic health check
- `GET /api/ready` - Readiness probe (database connectivity)
- `GET /api/live` - Liveness probe (application status)
- `GET /api/health/detailed` - Comprehensive health report

### Monitoring Features
- Application performance monitoring
- Database performance tracking
- Real-time error tracking
- Custom business metrics

## 🔧 Configuration

### Environment Variables

See `.env.example` for a complete list of configuration options.

**Required Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `SESSION_SECRET` - Secret for session management

**Optional Variables**:
- `AWS_REGION` - AWS region for deployment
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limiting configuration

### Database Configuration

The application uses PostgreSQL with Drizzle ORM. The schema is defined in `shared/schema.ts` and includes:
- User management and authentication
- Loan offers and terms
- Payment tracking and approval workflows
- Notification system
- Audit and compliance logging

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**:
```bash
# Check database connectivity
npm run health-check

# Verify environment variables
echo $DATABASE_URL
```

**Build Failures**:
```bash
# Clear build cache
rm -rf dist/ node_modules/
npm install
npm run build
```

**AWS Deployment Issues**:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify CloudFormation stack status
aws cloudformation describe-stacks --stack-name production-crednxt-infrastructure
```

### Logs

**Application Logs**:
- Development: Console output
- Production: CloudWatch Logs

**Database Logs**:
- Available in AWS RDS console
- Query performance insights enabled

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the health check endpoints for diagnostic information

## 🚀 Roadmap

- [ ] Mobile app development (React Native)
- [ ] Advanced analytics and reporting
- [ ] Integration with payment gateways
- [ ] Machine learning for risk assessment
- [ ] Multi-language support
- [ ] API for third-party integrations