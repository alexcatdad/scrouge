# Suggested Commands

## Development

```bash
# Start Vite dev server with HMR (frontend only)
bun run dev

# Start Convex backend (run in separate terminal)
bun run dev:backend

# Both are typically needed for full development
```

## Building and Serving

```bash
# Build for production (outputs to dist/)
bun run build

# Preview production build locally (Vite preview server)
bun run preview

# Serve production build with Bun server
bun run serve
```

## Linting and Formatting (Biome)

```bash
# Run Biome check + TypeScript type checking
bun run lint

# Auto-fix linting and formatting issues
bun run lint:fix

# Format code with Biome
bun run format

# TypeScript type checking only
bun run typecheck
```


## Testing

```bash
# Run unit tests (Bun test runner)
bun run test
bun run test:unit

# Run E2E tests (Playwright)
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui

# Run E2E tests in headed browser mode
bun run test:e2e:headed
```

## System Utilities (macOS/Darwin)

```bash
# List directory contents
ls -la

# Find files
find . -name "*.ts" -type f

# Search in files
grep -r "pattern" src/

# Git operations
git status
git diff
git add .
git commit -m "message"
```

## Environment Setup

Required environment variables:
- `.env.local`: `VITE_CONVEX_URL` - Convex deployment URL

Convex Dashboard variables:
- `AI_ENCRYPTION_KEY` - For encrypting API keys (generate: `openssl rand -hex 32`)
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` - GitHub OAuth (optional)
- `AUTH_AUTHENTIK_ID`, `AUTH_AUTHENTIK_SECRET`, `AUTH_AUTHENTIK_ISSUER` - Authentik (optional)

## Docker

```bash
# Build Docker image
docker build --build-arg VITE_CONVEX_URL=https://your-deployment.convex.cloud -t scrouge .

# Run with docker-compose
docker compose up
```
