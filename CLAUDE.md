## Knowledge Base First

Start in `scrouge-kb/` before making meaningful changes:

1. `scrouge-kb/Master Spec Index.md`
2. `scrouge-kb/Implementation Planning.md`
3. `scrouge-kb/Production Readiness Next Steps.md`
4. `scrouge-kb/Human Input Checklist.md`
5. `scrouge-kb/Decision Log.md`

The knowledge base is the canonical repo-local navigation and current-state layer for this repo.

## Source Of Truth

- Start with `README.md` when present for product or repo overview.
- Use the rest of this file as project-specific implementation guidance.
- Use `docs/`, specs, plans, manifests, or other repo-local canonical files when present as the deeper source of truth.
- Use the knowledge base for navigation, current-state truth, readiness tracking, and blocker tracking.

## KB Update Rules

The knowledge base is not optional documentation. Keep it current as part of the work.

- Update `scrouge-kb/Decision Log.md` when a change affects architecture, delivery posture, release posture, or what the repo promises.
- Update `scrouge-kb/Production Readiness Next Steps.md` when work closes or reveals a production, operational, or release-confidence gap.
- Update `scrouge-kb/Human Input Checklist.md` when progress depends on credentials, environment access, machine setup, external services, or a human product decision.
- Update `scrouge-kb/Implementation Planning.md` when repo-level execution strategy or near-term priorities change materially.
- Update `scrouge-kb/Master Spec Index.md` when you add or move a durable canonical note so navigation stays accurate.

Do not leave important decisions, blockers, or readiness changes only in chat, PRs, or commit messages.
Do not use the knowledge base to compete with deeper canonical docs. The knowledge base should summarize current state and point to the deeper source of truth.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Vite dev server with HMR)
bun run dev

# Run Convex backend separately
bunx convex dev         # Convex backend

# Build for production
bun run build           # SvelteKit production build (outputs to build/)

# Preview production build locally
bun run preview         # Vite preview server

# Lint and format
bun run check           # Svelte + TypeScript checking
bun run check:watch     # Watch mode

# Testing
bun run test            # Run unit tests (Vitest)
bun run test:e2e        # Run E2E tests (Playwright)
bun run test:e2e:ui     # Run E2E tests with UI
```

## Architecture

This is a subscription tracking app built with **SvelteKit + Convex + Better Auth**.

### Stack
- **Framework**: SvelteKit 2 with Svelte 5
- **Build Tool**: Vite 7 (via SvelteKit)
- **Runtime**: Node.js (adapter-node for production)
- **Backend**: Convex (serverless database + functions)
- **Auth**: @convex-dev/better-auth with better-auth (password, GitHub OAuth, Authentik OIDC)
- **Styling**: Tailwind CSS v4
- **AI**: Vercel AI SDK with multiple providers (OpenAI, xAI, Mistral, Ollama)

### Directory Structure
```
svelte.config.js  # SvelteKit configuration (adapter-node)
vite.config.ts    # Vite configuration
src/
  app.html        # HTML template
  app.css         # Tailwind source CSS
  app.d.ts        # TypeScript declarations
  routes/
    +layout.svelte      # Root layout with Convex provider
    +layout.ts          # Layout data loader
    +page.svelte        # Landing page
    health/+server.ts   # Health check endpoint for Docker
    (auth)/             # Auth routes (sign-in, sign-up)
    (dashboard)/        # Protected dashboard routes
    wizard/             # Onboarding wizard
  lib/
    auth-client.ts      # Better Auth client
    auth.ts             # Auth utilities
    guestStorage.ts     # Guest mode localStorage
    guestStore.svelte.ts # Guest mode Svelte store
convex/
  schema.ts       # Database schema (extends authTables)
  auth.ts         # Better Auth server configuration
  http.ts         # HTTP router (mounts auth + custom routes)
  router.ts       # User-defined HTTP routes (MCP API, invites, tests)
  subscriptions.ts, paymentMethods.ts, aiSettings.ts  # CRUD operations
  serviceRequests.ts  # Service template requests (admin features)
  admin.ts        # Admin role management
  lib/
    encryption.ts # API key encryption utilities
    rateLimit.ts  # Rate limiting
    admin.ts      # Admin authorization helpers
build/            # SvelteKit build output (generated)
tests/            # Unit tests (Vitest)
e2e/              # E2E tests (Playwright)
```

### Key Patterns

**SvelteKit Routes**: File-based routing with `+page.svelte` for pages, `+server.ts` for API endpoints, `+layout.svelte` for layouts.

**Svelte 5 Runes**: Uses `$state`, `$derived`, `$effect` for reactivity. Props via `$props()`.

**Convex Integration**: Uses `convex-svelte` package. Setup in root layout:
```svelte
<script lang="ts">
  import { setupConvex } from "convex-svelte";
  setupConvex(data.convexUrl);
</script>
```

**Convex Functions**: Always use new function syntax with validators:
```typescript
export const myQuery = query({
  args: { id: v.id("table") },
  returns: v.object({...}),
  handler: async (ctx, args) => {...}
});
```

**Database Access**: Use `ctx.db` in queries/mutations. Actions cannot access the database directly - use `ctx.runQuery`/`ctx.runMutation`.

**Admin Authorization**: Use `requireAdmin()` from `convex/lib/admin.ts` for admin-only functions.

## Environment Variables

**Local** (in `.env` or `.env.local`):
- `PUBLIC_CONVEX_URL` - Convex deployment URL (required, baked into build)

**Convex Dashboard**:
- `BETTER_AUTH_SECRET` - Secret for Better Auth sessions
- `SITE_URL` - Your app's URL (e.g., http://localhost:5173)
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

### Admin Setup

After first deployment, seed the first admin via Convex dashboard:
```
internal.admin.seedFirstAdmin({ email: "your-email@example.com" })
```
