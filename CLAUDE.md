# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Vite dev server with HMR)
bun run dev

# Run Convex backend separately
bun run dev:backend    # Convex backend (convex dev)

# Build for production
bun run build          # Vite production build (outputs to dist/)

# Preview production build locally
bun run preview        # Vite preview server

# Serve production build with Bun
bun run serve          # Bun server serving dist/

# Lint and format (Biome + TypeScript)
bun run lint           # Runs Biome check + tsc on both convex/ and src/
bun run lint:fix       # Auto-fix linting and formatting issues
bun run format         # Format code with Biome
bun run typecheck      # TypeScript type checking only
```

## Architecture

This is a subscription tracking app built with **Vite + Bun + Convex + React**.

### Stack
- **Build Tool**: Vite (development server + production bundler)
- **Runtime**: Bun (production server)
- **Backend**: Convex (serverless database + functions)
- **Frontend**: React 19 with Tailwind CSS v4
- **Auth**: @convex-dev/auth (password, anonymous, GitHub OAuth, Authentik OIDC)
- **AI**: Vercel AI SDK with multiple providers (OpenAI, xAI, Mistral, Ollama)
- **Env Validation**: @t3-oss/env-core with Zod

### Directory Structure
```
index.ts          # Bun production server - serves Vite build output
index.html        # Entry point - loads src/main.tsx
vite.config.ts    # Vite configuration
src/
  App.tsx         # Main app component with auth state
  SignInForm.tsx  # Multi-provider auth form
  main.tsx        # React entry point with Convex client
  components/     # Feature components (Dashboard, Chat, Subscriptions, etc.)
  lib/
    env.ts        # Type-safe environment variables (t3-env)
    monitoring.ts # Error monitoring (console-only)
  index.css       # Tailwind source CSS
  vite-env.d.ts   # TypeScript declarations for import.meta.env
convex/
  schema.ts       # Database schema (extends authTables)
  auth.ts         # Auth configuration
  http.ts         # HTTP router (auth routes only - don't modify)
  router.ts       # User-defined HTTP routes (modify this one)
  chat.ts         # AI chat with tool calling
  subscriptions.ts, paymentMethods.ts, aiSettings.ts  # CRUD operations
  lib/encryption.ts  # API key encryption utilities
dist/             # Vite build output (generated)
```

### Key Patterns

**Environment Variables**: Uses `@t3-oss/env-core` for type-safe, validated environment variables via Vite's `import.meta.env`. See `src/lib/env.ts` for the schema.

**Vite Build**: Development uses Vite's dev server with HMR. Production builds are bundled by Vite and served by the Bun server (`index.ts`).

**Convex Functions**: Always use new function syntax with validators:
```typescript
export const myQuery = query({
  args: { id: v.id("table") },
  returns: v.object({...}),
  handler: async (ctx, args) => {...}
});
```

**Database Access**: Use `ctx.db` in queries/mutations. Actions cannot access the database directly - use `ctx.runQuery`/`ctx.runMutation`.

**AI Chat**: The chat system uses Vercel AI SDK with tool calling. User API keys are encrypted at rest using AES-256-GCM (requires `AI_ENCRYPTION_KEY` env var in Convex dashboard).

## Environment Variables

**Local** (in `.env` or `.env.local`):
- `VITE_CONVEX_URL` - Convex deployment URL (required, baked into build)
- `PORT` - Server port for production (defaults to 3000)

**Convex Dashboard**:
- `AI_ENCRYPTION_KEY` - For encrypting user API keys (generate with `openssl rand -hex 32`)
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` - GitHub OAuth (optional)
- `AUTH_AUTHENTIK_ID`, `AUTH_AUTHENTIK_SECRET`, `AUTH_AUTHENTIK_ISSUER` - Authentik OIDC (optional)

## CI/CD & Deployment

The app is containerized with Docker and supports CI/CD on both **GitHub Actions** and **Gitea Actions**.

### Docker

```bash
# Build Docker image locally (requires VITE_CONVEX_URL at build time)
docker build --build-arg VITE_CONVEX_URL=https://your-deployment.convex.cloud -t scrouge .

# Run locally with docker-compose
docker compose up

# Or run directly
docker run -p 3000:3000 scrouge
```

### CI/CD Workflows

| Workflow | Location | Purpose |
|----------|----------|---------|
| `ci.yaml` | `.github/workflows/` | Quality checks, security scanning, E2E tests, build |
| `release.yaml` | `.github/workflows/` | Changesets version management, Git tagging |
| `deploy.yaml` | `.github/workflows/` | Docker build & deploy to production (GHCR) |
| `deploy.yaml` | `.gitea/workflows/` | Docker build & deploy to production (Gitea) |
| `release.yaml` | `.gitea/workflows/` | Changesets version management |

### Required Secrets

| Secret | GitHub | Gitea | Description |
|--------|--------|-------|-------------|
| `VITE_CONVEX_URL` | Yes | Yes | Convex deployment URL (build-time) |
| `CONVEX_URL` | Yes | Yes | Convex runtime URL (deployment) |
| `DEPLOY_HOST` | Yes | Yes | SSH deployment server |
| `DEPLOY_USER` | Yes | Yes | SSH username |
| `DEPLOY_SSH_KEY` | Yes | Yes | SSH private key |
| `REGISTRY_TOKEN` | No | Yes | Gitea Container Registry token |
| `GITHUB_TOKEN` | Auto | No | Auto-provided by GitHub |

### Versioning

Uses Changesets for semantic versioning:
```bash
bun run changeset        # Create a changeset
bun run changeset:status # Check pending changesets
bun run version          # Apply version bumps
```
