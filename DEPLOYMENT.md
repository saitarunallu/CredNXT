# CredNXT AWS Deployment Guide

This guide provides step-by-step instructions for deploying CredNXT to AWS using the provided infrastructure automation.

## Prerequisites

1. **AWS Account Setup**
   - AWS CLI installed and configured
   - Appropriate IAM permissions for ECS, RDS, VPC, and CloudFormation
   - Docker installed and running

2. **Required Tools**
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Configure AWS credentials
   aws configure
   ```

3. **Environment Variables**
   - Generate secure secrets for production
   - Configure database credentials
   - Set up monitoring and alerting

## Quick Deployment (Automated)

### 1. Setup Environment
```bash
# Generate secure secrets and configure AWS environment
./aws/environment-config.sh production

# This will:
# - Generate secure JWT and session secrets
# - Create database password
# - Store secrets in AWS Parameter Store
# - Create environment configuration file
```

### 2. Deploy to AWS
```bash
# Deploy complete infrastructure and application
./aws/deploy.sh production

# This will:
# - Create ECR repository
# - Build and push Docker image
# - Deploy CloudFormation stack
# - Update ECS service
# - Wait for deployment completion
```

### 3. Verify Deployment
```bash
# Check application health
LOAD_BALANCER_URL=$(aws cloudformation describe-stacks \
  --stack-name production-crednxt-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
  --output text)

curl -f $LOAD_BALANCER_URL/api/health
```

## Manual Deployment Steps

### 1. Environment Configuration

Create `.env.production` file:
```bash
cp .env.example .env.production
# Edit with your production values
```

Required environment variables:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-secure-jwt-secret-32-chars-min
SESSION_SECRET=your-secure-session-secret-32-chars-min
```

### 2. Build and Test Locally

```bash
# Build the application
npm run build

# Test with Docker
npm run docker:build
npm run docker:run

# Verify health endpoints
curl -f http://localhost:5000/api/health
curl -f http://localhost:5000/api/ready
curl -f http://localhost:5000/api/live
```

### 3. AWS Infrastructure Setup

```bash
# Create CloudFormation stack
aws cloudformation deploy \
  --template-file aws/cloudformation.yml \
  --stack-name production-crednxt-infrastructure \
  --parameter-overrides \
    Environment=production \
    DatabasePassword=$DATABASE_PASSWORD \
    JWTSecret=$JWT_SECRET \
    SessionSecret=$SESSION_SECRET \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

### 4. Container Registry Setup

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name crednxt \
  --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### 5. Build and Push Docker Image

```bash
# Build image
docker build -t crednxt .

# Tag for ECR
docker tag crednxt:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/crednxt:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/crednxt:latest
```

### 6. Deploy to ECS

```bash
# Update ECS service to use new image
aws ecs update-service \
  --cluster production-crednxt-cluster \
  --service production-crednxt-service \
  --force-new-deployment \
  --region us-east-1

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster production-crednxt-cluster \
  --services production-crednxt-service \
  --region us-east-1
```

## Deployment Architecture

The CloudFormation template creates:

### Network Infrastructure
- **VPC**: 10.0.0.0/16 with Internet Gateway
- **Subnets**: 
  - 2 Public subnets (10.0.1.0/24, 10.0.2.0/24)
  - 2 Private subnets (10.0.3.0/24, 10.0.4.0/24)
- **Security Groups**: Least-privilege access rules

### Application Infrastructure
- **ECS Fargate Cluster**: Container orchestration
- **Application Load Balancer**: Traffic distribution with health checks
- **RDS PostgreSQL**: Managed database with automated backups
- **CloudWatch**: Logging and monitoring

### Security Features
- **IAM Roles**: Least-privilege access for ECS tasks
- **Security Groups**: Network-level security
- **Secrets Management**: Environment variables stored securely
- **Container Security**: Non-root user execution

## Monitoring and Troubleshooting

### Health Check Endpoints

```bash
# Basic health check
curl $LOAD_BALANCER_URL/api/health

# Readiness check (database connectivity)
curl $LOAD_BALANCER_URL/api/ready

# Liveness check (application status)
curl $LOAD_BALANCER_URL/api/live

# Detailed health report
curl $LOAD_BALANCER_URL/api/health/detailed
```

### CloudWatch Logs

```bash
# View application logs
aws logs describe-log-groups --log-group-name-prefix "/aws/ecs/production-crednxt"

# Tail logs in real-time
aws logs tail /aws/ecs/production-crednxt --follow
```

### Common Issues

**Deployment Fails**:
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name production-crednxt-infrastructure

# Check ECS service status
aws ecs describe-services \
  --cluster production-crednxt-cluster \
  --services production-crednxt-service
```

**Application Not Responding**:
```bash
# Check ECS task status
aws ecs list-tasks --cluster production-crednxt-cluster
aws ecs describe-tasks --cluster production-crednxt-cluster --tasks TASK_ARN

# Check logs
aws logs filter-log-events \
  --log-group-name /aws/ecs/production-crednxt \
  --start-time $(date -d '1 hour ago' +%s)000
```

**Database Connection Issues**:
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier production-crednxt-postgres

# Test database connectivity from ECS task
aws ecs execute-command \
  --cluster production-crednxt-cluster \
  --task TASK_ARN \
  --container crednxt-app \
  --interactive \
  --command "/bin/sh"
```

## Environment Management

### Staging Environment

```bash
# Deploy to staging
./aws/deploy.sh staging

# Or manually:
aws cloudformation deploy \
  --template-file aws/cloudformation.yml \
  --stack-name staging-crednxt-infrastructure \
  --parameter-overrides Environment=staging
```

### Production Environment

```bash
# Deploy to production with additional safeguards
./aws/deploy.sh production

# Enable deletion protection
aws rds modify-db-instance \
  --db-instance-identifier production-crednxt-postgres \
  --deletion-protection
```

## Scaling and Performance

### Auto Scaling

```bash
# Set up ECS service auto scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/production-crednxt-cluster/production-crednxt-service \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --policy-name production-crednxt-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/production-crednxt-cluster/production-crednxt-service \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Database Performance

```bash
# Enable Performance Insights
aws rds modify-db-instance \
  --db-instance-identifier production-crednxt-postgres \
  --enable-performance-insights
```

## Security Considerations

### Secrets Management

Store sensitive data in AWS Secrets Manager:
```bash
# Create secret for database credentials
aws secretsmanager create-secret \
  --name production/crednxt/database \
  --description "Database credentials for CredNXT production" \
  --secret-string '{"username":"postgres","password":"your-secure-password"}'

# Create secret for application secrets
aws secretsmanager create-secret \
  --name production/crednxt/application \
  --description "Application secrets for CredNXT production" \
  --secret-string '{"jwt_secret":"your-jwt-secret","session_secret":"your-session-secret"}'
```

### SSL/TLS Certificate

```bash
# Request ACM certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --validation-method DNS \
  --region us-east-1

# Update ALB listener to use HTTPS
aws elbv2 create-listener \
  --load-balancer-arn $LOAD_BALANCER_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERTIFICATE_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
```

## Backup and Recovery

### Database Backups

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier production-crednxt-postgres \
  --db-snapshot-identifier production-crednxt-manual-snapshot-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier production-crednxt-postgres-restored \
  --db-snapshot-identifier production-crednxt-manual-snapshot-20250814
```

### Application Rollback

```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster production-crednxt-cluster \
  --service production-crednxt-service \
  --task-definition production-crednxt:PREVIOUS_REVISION
```

## Cost Optimization

### Resource Monitoring

```bash
# Check costs
aws ce get-cost-and-usage \
  --time-period Start=2025-08-01,End=2025-08-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Right-sizing

- Start with t3.micro for ECS tasks
- Monitor CPU/memory usage and scale accordingly
- Use RDS t3.micro for development, upgrade for production
- Enable ECS Service scaling based on metrics

## Maintenance

### Regular Tasks

```bash
# Update container image
docker build -t crednxt .
docker tag crednxt:latest $ECR_URI:latest
docker push $ECR_URI:latest
aws ecs update-service --cluster production-crednxt-cluster --service production-crednxt-service --force-new-deployment

# Database maintenance
aws rds describe-pending-maintenance-actions
aws rds apply-pending-maintenance-action --resource-identifier production-crednxt-postgres --apply-action system-update

# Security updates
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
docker pull node:20-alpine  # Update base image
```

This deployment guide provides comprehensive instructions for deploying CredNXT to AWS with production-ready infrastructure, monitoring, and security configurations.