# SubTracker

A subscription tracking application built with [Bun](https://bun.sh) and [Convex](https://convex.dev).

## Project structure

The frontend code is in the `src` directory and is served using Bun's built-in server with HTML imports.

The backend code is in the `convex` directory.

## Getting started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up your Convex deployment (if not already done):
   ```bash
   bunx convex dev
   ```

3. Set the `CONVEX_URL` environment variable (Bun automatically loads `.env` files):
   ```bash
   echo "CONVEX_URL=https://your-deployment.convex.cloud" > .env
   ```

4. Set up AI encryption key in Convex dashboard:
   - Go to your Convex dashboard → Settings → Environment Variables
   - Add a new variable: `AI_ENCRYPTION_KEY`
   - Generate a secure key: `openssl rand -hex 32`
   - Paste the generated key as the value
   - This key is used to encrypt user API keys at rest

4. Start the development server:
   ```bash
   bun run dev
   ```

   Or run frontend and backend separately:
   ```bash
   bun run dev          # Frontend server
   bun run dev:backend  # Convex backend
   ```

## App authentication

This app uses [Convex Auth](https://auth.convex.dev/) with multiple authentication providers:

- **Password authentication** - Email and password sign-in
- **Anonymous authentication** - Quick guest access
- **GitHub OAuth** - Sign in with GitHub account
- **Authentik OIDC** - Enterprise SSO via Authentik

### Setting up OAuth providers

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps
2. Create a new OAuth App
3. Set the Authorization callback URL to: `https://<your-convex-deployment>.convex.site/api/auth/callback/github`
4. Set environment variables in your Convex dashboard:
   ```bash
   npx convex env set AUTH_GITHUB_ID your_github_client_id
   npx convex env set AUTH_GITHUB_SECRET your_github_client_secret
   ```

#### Authentik OIDC

1. In your Authentik admin panel, create a new OAuth2/OpenID Provider
2. Set the Redirect URI to: `https://<your-convex-deployment>.convex.site/api/auth/callback/authentik`
3. Copy the Client ID, Client Secret, and Issuer URL
4. Set environment variables in your Convex dashboard:
   ```bash
   npx convex env set AUTH_AUTHENTIK_ID your_authentik_client_id
   npx convex env set AUTH_AUTHENTIK_SECRET your_authentik_client_secret
   npx convex env set AUTH_AUTHENTIK_ISSUER https://your-authentik-domain.com/application/o/your-app/
   ```

**Note:** OAuth providers are optional. If not configured, users can still sign in with email/password or anonymously.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
