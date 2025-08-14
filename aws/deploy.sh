#!/bin/bash

# AWS Deployment Script for CredNXT P2P Lending Platform
set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPOSITORY_NAME="crednxt"
STACK_NAME="${ENVIRONMENT}-crednxt-infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Please install AWS CLI."
    fi
    
    if ! command -v docker &> /dev/null; then
        error "Docker not found. Please install Docker."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please run 'aws configure'."
    fi
    
    log "Prerequisites check passed."
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    log "Creating ECR repository if it doesn't exist..."
    
    aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION &> /dev/null || {
        log "Creating ECR repository: $ECR_REPOSITORY_NAME"
        aws ecr create-repository \
            --repository-name $ECR_REPOSITORY_NAME \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true
    }
    
    log "ECR repository ready."
}

# Build and push Docker image
build_and_push_image() {
    log "Building and pushing Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Build image
    log "Building Docker image..."
    docker build -t $ECR_REPOSITORY_NAME .
    
    # Tag image
    docker tag $ECR_REPOSITORY_NAME:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/$ECR_REPOSITORY_NAME:latest
    
    # Push image
    log "Pushing Docker image to ECR..."
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/$ECR_REPOSITORY_NAME:latest
    
    log "Docker image pushed successfully."
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    log "Deploying CloudFormation stack..."
    
    # Check if required parameters are set
    if [ -z "$DATABASE_PASSWORD" ]; then
        error "DATABASE_PASSWORD environment variable is required"
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        error "JWT_SECRET environment variable is required"
    fi
    
    if [ -z "$SESSION_SECRET" ]; then
        error "SESSION_SECRET environment variable is required"
    fi
    
    # Deploy stack
    aws cloudformation deploy \
        --template-file aws/cloudformation.yml \
        --stack-name $STACK_NAME \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
            DatabasePassword=$DATABASE_PASSWORD \
            JWTSecret=$JWT_SECRET \
            SessionSecret=$SESSION_SECRET \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION
    
    log "CloudFormation stack deployed successfully."
}

# Update ECS service
update_ecs_service() {
    log "Updating ECS service..."
    
    # Get cluster and service names from CloudFormation outputs
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    SERVICE_NAME="${ENVIRONMENT}-crednxt-service"
    
    # Force new deployment to pull latest image
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --force-new-deployment \
        --region $AWS_REGION
    
    log "ECS service update initiated."
}

# Wait for deployment to complete
wait_for_deployment() {
    log "Waiting for deployment to complete..."
    
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    SERVICE_NAME="${ENVIRONMENT}-crednxt-service"
    
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $AWS_REGION
    
    log "Deployment completed successfully!"
}

# Get application URL
get_application_url() {
    log "Getting application URL..."
    
    URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
        --output text)
    
    log "Application is available at: $URL"
    log "Health check: $URL/api/health"
}

# Main deployment process
main() {
    log "Starting deployment of CredNXT to AWS ($ENVIRONMENT environment)"
    
    # Get AWS account ID
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log "Using AWS Account: $AWS_ACCOUNT_ID"
    
    check_prerequisites
    create_ecr_repository
    build_and_push_image
    deploy_infrastructure
    update_ecs_service
    wait_for_deployment
    get_application_url
    
    log "Deployment completed successfully!"
    log "Don't forget to:"
    log "1. Configure your domain name to point to the load balancer"
    log "2. Set up SSL certificate for HTTPS"
    log "3. Configure monitoring and alerting"
    log "4. Set up database backups"
}

# Run deployment
main "$@"