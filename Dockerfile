# Multi-stage build for production deployment
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development dependencies for building
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy any additional files needed for production
COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["npm", "start"]