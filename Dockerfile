# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build argument for Convex URL (required at build time for SvelteKit)
# SvelteKit uses PUBLIC_ prefix for client-side env vars ($env/static/public)
ARG PUBLIC_CONVEX_URL
ENV PUBLIC_CONVEX_URL=$PUBLIC_CONVEX_URL

# Build the application
RUN bun run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install curl for health checks (used by deploy workflow)
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Install only production dependencies for Node runtime
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S svelte -u 1001 -G nodejs

USER svelte

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check (matches deploy workflow health-cmd)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "build/index.js"]
