#!/bin/bash

# AWS Environment Configuration for CredNXT
# This script sets up environment-specific configuration

set -e

ENVIRONMENT=${1:-production}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Generate secure random secrets
generate_secrets() {
    log "Generating secure secrets..."
    
    export JWT_SECRET=$(openssl rand -hex 32)
    export SESSION_SECRET=$(openssl rand -hex 32)
    export DATABASE_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    log "Secrets generated successfully."
}

# Save secrets to AWS Systems Manager Parameter Store
save_secrets_to_ssm() {
    log "Saving secrets to AWS Systems Manager Parameter Store..."
    
    aws ssm put-parameter \
        --name "/${ENVIRONMENT}/crednxt/jwt-secret" \
        --value "$JWT_SECRET" \
        --type "SecureString" \
        --overwrite \
        --description "JWT Secret for CredNXT ${ENVIRONMENT} environment"
    
    aws ssm put-parameter \
        --name "/${ENVIRONMENT}/crednxt/session-secret" \
        --value "$SESSION_SECRET" \
        --type "SecureString" \
        --overwrite \
        --description "Session Secret for CredNXT ${ENVIRONMENT} environment"
    
    aws ssm put-parameter \
        --name "/${ENVIRONMENT}/crednxt/database-password" \
        --value "$DATABASE_PASSWORD" \
        --type "SecureString" \
        --overwrite \
        --description "Database Password for CredNXT ${ENVIRONMENT} environment"
    
    log "Secrets saved to Parameter Store."
}

# Load secrets from AWS Systems Manager Parameter Store
load_secrets_from_ssm() {
    log "Loading secrets from AWS Systems Manager Parameter Store..."
    
    export JWT_SECRET=$(aws ssm get-parameter \
        --name "/${ENVIRONMENT}/crednxt/jwt-secret" \
        --with-decryption \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")
    
    export SESSION_SECRET=$(aws ssm get-parameter \
        --name "/${ENVIRONMENT}/crednxt/session-secret" \
        --with-decryption \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")
    
    export DATABASE_PASSWORD=$(aws ssm get-parameter \
        --name "/${ENVIRONMENT}/crednxt/database-password" \
        --with-decryption \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$JWT_SECRET" ] || [ -z "$SESSION_SECRET" ] || [ -z "$DATABASE_PASSWORD" ]; then
        warn "Some secrets not found in Parameter Store. Generating new ones..."
        generate_secrets
        save_secrets_to_ssm
    else
        log "Secrets loaded from Parameter Store."
    fi
}

# Create environment file
create_env_file() {
    log "Creating environment file..."
    
    cat > .env.${ENVIRONMENT} << EOF
# CredNXT ${ENVIRONMENT} Environment Configuration
NODE_ENV=${ENVIRONMENT}
PORT=5000

# Database Configuration
DATABASE_URL=postgresql://postgres:${DATABASE_PASSWORD}@localhost:5432/crednxt

# Authentication Secrets
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# AWS Configuration
AWS_REGION=${AWS_REGION:-us-east-1}

# Banking & Compliance
AUDIT_ENABLED=true
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security Headers
HELMET_ENABLED=true
CORS_ENABLED=true

# Monitoring
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
EOF

    log "Environment file created: .env.${ENVIRONMENT}"
}

# Setup CloudWatch monitoring
setup_monitoring() {
    log "Setting up CloudWatch monitoring..."
    
    # Create CloudWatch dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "CredNXT-${ENVIRONMENT}" \
        --dashboard-body '{
            "widgets": [
                {
                    "type": "metric",
                    "properties": {
                        "metrics": [
                            ["AWS/ECS", "CPUUtilization", "ServiceName", "'${ENVIRONMENT}'-crednxt-service"],
                            [".", "MemoryUtilization", ".", "."]
                        ],
                        "period": 300,
                        "stat": "Average",
                        "region": "'${AWS_REGION:-us-east-1}'",
                        "title": "ECS Service Metrics"
                    }
                },
                {
                    "type": "metric",
                    "properties": {
                        "metrics": [
                            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "'${ENVIRONMENT}'-crednxt-alb"],
                            [".", "RequestCount", ".", "."]
                        ],
                        "period": 300,
                        "stat": "Sum",
                        "region": "'${AWS_REGION:-us-east-1}'",
                        "title": "Load Balancer Metrics"
                    }
                }
            ]
        }'
    
    log "CloudWatch dashboard created."
}

# Main function
main() {
    log "Setting up AWS environment configuration for: $ENVIRONMENT"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Please install AWS CLI."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please run 'aws configure'."
    fi
    
    load_secrets_from_ssm
    create_env_file
    setup_monitoring
    
    log "Environment configuration completed!"
    log "Environment file: .env.${ENVIRONMENT}"
    log "To deploy, run: ./aws/deploy.sh ${ENVIRONMENT}"
}

# Run main function
main "$@"