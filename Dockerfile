FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build arguments for environment variables needed at build time
# These are baked into the Vite bundle
ARG VITE_CONVEX_URL
ARG VITE_SENTRY_DSN

# Set environment variables for the build
ENV VITE_CONVEX_URL=${VITE_CONVEX_URL}
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}

# Build the frontend with Vite
RUN bun run build

# Production image
FROM oven/bun:1-slim
WORKDIR /app

# Copy only what's needed for production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.ts ./index.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "serve"]
