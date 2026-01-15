# Closed Beta Design: SvelteKit Migration + Onboarding

## Goal

Get Scrouge ready for closed beta usage by friends on a Tailscale-protected server.

## Core Problems to Solve

1. **Adding subscriptions is tedious** - Too many fields, too much manual entry
2. **No guidance on first use** - Users land on an empty dashboard with no direction

## Solution

1. **Pre-populated service templates** (100+ services) - Pick "Netflix" from a list, auto-fill details
2. **Quick-start wizard** - First-time users guided through adding their subscriptions
3. **SvelteKit migration first** - Better DX with Claude Code, Bun, and Convex

## Architecture

### SvelteKit Route Structure

```
src/routes/
  +layout.svelte        # App shell, auth state, header
  +page.svelte          # Landing page or redirect to /dashboard

  dashboard/
    +page.svelte        # Main dashboard with tabs/sections
    +layout.svelte      # Dashboard layout (authenticated only)

  wizard/
    +page.svelte        # Quick-start wizard (full-screen, own layout)
    +layout.svelte      # Minimal layout, no header nav

  invite/[token]/
    +page.svelte        # Invite claim flow

  settings/
    +page.svelte        # AI settings, account
```

### Convex Backend Additions

**New table: `serviceTemplates`**

```typescript
serviceTemplates: defineTable({
  name: v.string(),
  category: v.union(
    v.literal("streaming"),
    v.literal("music"),
    v.literal("gaming"),
    v.literal("productivity"),
    v.literal("news"),
    v.literal("fitness"),
    v.literal("cloud"),
    v.literal("other")
  ),
  icon: v.optional(v.string()),
  website: v.optional(v.string()),
  defaultPrice: v.optional(v.number()),
  defaultCurrency: v.string(),
  defaultBillingCycle: v.string(),
  plans: v.optional(v.array(v.object({
    name: v.string(),
    price: v.number(),
  }))),
}).index("by_category", ["category"])
  .searchIndex("search_name", { searchField: "name" })
```

**New table: `serviceRequests`**

```typescript
serviceRequests: defineTable({
  serviceName: v.string(),
  website: v.optional(v.string()),
  requestedBy: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  createdAt: v.number(),
  notes: v.optional(v.string()),
}).index("by_status", ["status"])
```

**New functions:**

- `templates.list` - Get all templates (with optional category filter)
- `templates.search` - Full-text search by name
- `templates.seed` - Internal mutation to populate initial data
- `requests.submit` - User submits a request
- `requests.listPending` - Admin view of pending requests

### Service Template Data

100+ services organized by category:

- **Streaming (15-20):** Netflix, Hulu, Disney+, HBO Max, Prime Video, Peacock, Paramount+, Apple TV+, Crunchyroll, etc.
- **Music (8-10):** Spotify, Apple Music, YouTube Music, Tidal, Deezer, etc.
- **Gaming (10-12):** Xbox Game Pass, PS Plus, Nintendo Online, EA Play, Humble, etc.
- **Productivity (15-20):** Microsoft 365, Google One, Notion, Dropbox, 1Password, etc.
- **News (8-10):** NYT, WSJ, The Athletic, Economist, etc.
- **Fitness (5-8):** Peloton, Strava, MyFitnessPal, etc.
- **Cloud (10-12):** iCloud, AWS, DigitalOcean, Cloudflare, etc.

Icons via `logo.clearbit.com/{domain}` or stored SVGs.

### Quick-Start Wizard Flow

**Step 1: "What do you subscribe to?"**

- Searchable grid of service logos, grouped by category tabs
- Click to select, bottom tray shows selected count
- "Continue" when at least 1 selected
- "Skip, I'll add manually" option

**Step 2: "Confirm your details"**

- List of selected services as expandable cards
- Pre-filled fields, user sets billing date + payment method
- Inline payment method creation if none exist

**Step 3: "You're all set!"**

- Summary: "4 subscriptions totaling $67/month"
- Saves all subscriptions in batch
- Navigate to dashboard

**State persistence:**

- Wizard state stored in localStorage on every change
- Restored on mount if less than 24 hours old
- "Continue where you left off?" prompt on resume
- Cleared on completion

### Service Request Flow

When a user can't find their subscription:

1. Search shows no results
2. "Can't find it? Request this service" link appears
3. Simple form: service name + optional website
4. Toast confirms submission
5. User continues with manual entry

Future: Export approved templates to a public GitHub repo for community contributions.

## Implementation Phases

### Phase 1: SvelteKit Foundation

- New SvelteKit project with Convex integration
- Auth working (GitHub, Authentik, Password)
- Basic layout and routing
- Deploy to Tailscale server

### Phase 2: Core Feature Parity

- Dashboard page with stats
- Subscription list (view, add, edit, delete)
- Payment methods CRUD
- Guest mode with localStorage

### Phase 3: Templates System

- Add `serviceTemplates` and `serviceRequests` tables
- Seed script with 100+ services
- Template picker component
- "Request a service" flow
- Integrate into "Add Subscription" form

### Phase 4: Quick-Start Wizard

- Wizard route with 3-step flow
- localStorage persistence
- Redirect new users to wizard
- Skip option

### Phase 5: Polish & Beta Launch

- End-to-end testing
- Fix rough edges
- Invite friends

## Definition of Beta Ready

- A friend can sign up, complete the wizard in under 2 minutes, and see a useful dashboard
- Adding a templated subscription takes ~10 seconds
- Nothing obviously broken
