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

This app uses [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
