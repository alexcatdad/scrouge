# Scrouge

> A modern subscription tracking application with AI-powered chat assistance, built with Bun, Convex, and React.

Scrouge helps you effortlessly track every subscription, monitor spending patterns, and reclaim control of your finances. Manage subscriptions through an intuitive interface or use natural language commands via the AI chat assistant.

## ✨ Features

- **📊 Subscription Management**: Track subscriptions with billing cycles, payment methods, categories, and notes
- **💳 Payment Method Tracking**: Link multiple payment methods (credit cards, bank accounts, PayPal, etc.)
- **🤖 AI Chat Assistant**: Natural language interface for managing subscriptions using multiple AI providers
- **🔒 Multiple Authentication Options**: Password, anonymous guest mode, GitHub OAuth, and Authentik OIDC
- **🌐 Internationalization**: Multi-language support (English, Spanish)
- **📱 Responsive Design**: Modern, mobile-friendly UI built with Tailwind CSS
- **🔐 Privacy-First**: User API keys encrypted at rest with AES-256-GCM
- **⚡ Real-time Updates**: Powered by Convex for instant data synchronization

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Backend**: Convex (serverless database + functions)
- **Runtime**: Bun
- **AI**: Vercel AI SDK with support for:
  - **WebLLM** (Local browser inference - recommended, no API key needed)
  - **OpenAI** (GPT-4, GPT-3.5, etc.)
  - **xAI** (Grok models)
  - **Mistral AI**
  - **Ollama** (Local or remote instances)
- **Auth**: @convex-dev/auth
- **Storage**: Dexie (IndexedDB) for guest mode and local chat storage

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0 or later)
- A [Convex](https://convex.dev) account (free tier available)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/scrouge.git
   cd scrouge
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up your Convex deployment**:
   ```bash
   bunx convex dev
   ```
   This will create a new Convex project and generate the necessary configuration files.

4. **Configure environment variables**:
   
   Create a `.env` file in the root directory:
   ```bash
   echo "VITE_CONVEX_URL=https://your-deployment.convex.cloud" > .env
   ```
   
   Replace `your-deployment` with your actual Convex deployment URL.

5. **Set up AI encryption key** (required for storing user API keys):
   - Go to your [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables
   - Add a new variable: `AI_ENCRYPTION_KEY`
   - Generate a secure key:
     ```bash
     openssl rand -hex 32
     ```
   - Paste the generated key as the value
   - This key is used to encrypt user API keys at rest using AES-256-GCM

6. **Start the development server**:
   ```bash
   bun run dev
   ```
   
   Or run frontend and backend separately:
   ```bash
   bun run dev          # Frontend server (Vite)
   bun run dev:backend  # Convex backend
   ```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

## 🔐 Authentication

This app uses [Convex Auth](https://auth.convex.dev/) with multiple authentication providers:

- **Password authentication** - Email and password sign-in
- **Anonymous authentication** - Quick guest access (data stored locally)
- **GitHub OAuth** - Sign in with GitHub account
- **Authentik OIDC** - Enterprise SSO via Authentik

### Setting up OAuth Providers

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

## 🤖 AI Chat Assistant

The AI chat assistant allows you to manage subscriptions using natural language. It supports multiple AI providers:

- **WebLLM (Recommended)**: Runs entirely in your browser, no API key required. Supports multiple models optimized for tool calling.
- **OpenAI**: Requires an API key. Supports GPT-4, GPT-3.5, and other OpenAI models.
- **xAI (Grok)**: Requires an API key. Access to Grok models.
- **Mistral AI**: Requires an API key. Access to Mistral's language models.
- **Ollama**: No API key required. Works with local or remote Ollama instances.

User API keys are encrypted at rest using AES-256-GCM before being stored in the database. They are only decrypted server-side when making API calls.

## 📁 Project Structure

```
scrouge/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── ChatInterface.tsx
│   │   ├── SubscriptionDashboard.tsx
│   │   └── ...
│   ├── lib/                # Utilities and hooks
│   │   ├── env.ts          # Environment variable validation
│   │   ├── webllm.ts       # WebLLM integration
│   │   └── ...
│   └── main.tsx            # React entry point
├── convex/                 # Convex backend
│   ├── schema.ts           # Database schema
│   ├── auth.ts             # Auth configuration
│   ├── chat.ts             # AI chat with tool calling
│   ├── subscriptions.ts    # Subscription CRUD operations
│   └── lib/                # Backend utilities
│       └── encryption.ts   # API key encryption
├── e2e/                    # End-to-end tests (Playwright)
├── tests/                  # Unit tests
├── index.ts                # Bun production server
└── vite.config.ts          # Vite configuration
```

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
bun test

# End-to-end tests
bun run test:e2e

# E2E tests with UI
bun run test:e2e:ui

# E2E tests in headed mode
bun run test:e2e:headed
```

## 🏗️ Building for Production

```bash
# Build the application
bun run build

# Preview the production build locally
bun run preview

# Serve the production build with Bun
bun run serve
```

## 🐳 Docker Deployment

The app is containerized with Docker:

```bash
# Build Docker image (requires VITE_CONVEX_URL at build time)
docker build --build-arg VITE_CONVEX_URL=https://your-deployment.convex.cloud -t scrouge .

# Run locally with docker-compose
docker compose up

# Or run directly
docker run -p 3000:3000 scrouge
```

## 🔒 Security & Privacy

- **API Key Encryption**: User API keys are encrypted at rest using AES-256-GCM
- **Environment Variables**: Sensitive configuration is stored in Convex dashboard, not in code
- **Type-Safe Env Validation**: Uses `@t3-oss/env-core` with Zod for runtime validation
- **No Hardcoded Secrets**: All secrets are managed through environment variables
- **Guest Mode**: Anonymous users can use the app with data stored locally in IndexedDB

## 📝 Environment Variables

### Local Development (`.env` file)

- `VITE_CONVEX_URL` - Convex deployment URL (required)
- `PORT` - Server port for production (defaults to 3000)

### Convex Dashboard

- `AI_ENCRYPTION_KEY` - For encrypting user API keys (required, generate with `openssl rand -hex 32`)
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` - GitHub OAuth (optional)
- `AUTH_AUTHENTIK_ID`, `AUTH_AUTHENTIK_SECRET`, `AUTH_AUTHENTIK_ISSUER` - Authentik OIDC (optional)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Auth Documentation](https://auth.convex.dev/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [WebLLM](https://webllm.mlc.ai/)

## 📄 License

This project is open source. Please check the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Convex](https://convex.dev) for the backend
- UI components styled with [Tailwind CSS](https://tailwindcss.com)
- AI capabilities powered by [Vercel AI SDK](https://sdk.vercel.ai/) and [WebLLM](https://webllm.mlc.ai/)
