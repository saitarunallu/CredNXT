# Multi-stage build for CredNXT P2P Lending Platform
# Base Node.js image with security updates
FROM node:20-alpine AS base

# Install security updates and required dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm ci --include=dev
COPY . .
EXPOSE 5000
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all dependencies (including dev dependencies)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# Install security updates and create non-root user
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy built application from build stage
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/dist ./dist
COPY --from=build --chown=nextjs:nodejs /app/package*.json ./
COPY --from=build --chown=nextjs:nodejs /app/server ./server
COPY --from=build --chown=nextjs:nodejs /app/shared ./shared
COPY --from=build --chown=nextjs:nodejs /app/client/dist ./client/dist

# Create necessary directories
RUN mkdir -p /app/contracts /app/kfs /app/schedules && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:5000/api/health', (res) => { \
    if (res.statusCode === 200) process.exit(0); \
    else process.exit(1); \
  }).on('error', () => process.exit(1));"

# Start the application
CMD ["dumb-init", "node", "server/index.js"]

# Labels for container metadata
LABEL \
  org.opencontainers.image.title="CredNXT" \
  org.opencontainers.image.description="P2P Lending Platform" \
  org.opencontainers.image.vendor="CredNXT" \
  org.opencontainers.image.source="https://github.com/crednxt/crednxt" \
  org.opencontainers.image.licenses="MIT"