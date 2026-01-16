# Phase 2+3: Core UI + Templates

## Overview

Build the core subscription management UI with template support integrated from the start. Mobile-first approach.

## Routes

```
src/routes/(dashboard)/
  dashboard/
    +page.svelte              # Stats: upcoming renewals, waste alerts
    subscriptions/
      +page.svelte            # Subscription list
      [id]/
        +page.svelte          # View/edit single subscription
      new/
        +page.svelte          # Template picker (searchable grid)
        [templateId]/
          +page.svelte        # Add form (pre-filled from template)
        manual/
          +page.svelte        # Add form (empty)
    settings/
      +page.svelte            # Payment methods, AI settings
```

## Navigation

- Header nav (desktop): Dashboard | Subscriptions | Settings
- Bottom tab bar (mobile): Same 3 items
- FAB on subscriptions list → `/subscriptions/new`

## Dashboard Stats

Primary (prominent cards):
- Upcoming renewals (next 7 days, expandable to 30)
- Waste alerts (unused family slots, inactive subscriptions)

Secondary (smaller):
- Monthly total cost

## Subscription List

- Cards showing: service icon, name, cost, next billing date
- Tap → detail page
- FAB "+" → template picker

## Template Picker

- Full-screen searchable grid
- Category tabs: All, Streaming, Music, Gaming, Productivity, etc.
- Service cards with logos (via Clearbit)
- "Can't find it? Add manually" option
- Search uses Convex search index

## Add/Edit Form

Fields:
- Service name (from template or manual)
- Cost + currency
- Billing cycle (daily/weekly/monthly/yearly)
- Next billing date
- Payment method (dropdown)
- Category
- Notes (optional)
- Family plan toggle → max slots field

## Database Additions

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
  website: v.optional(v.string()),
  icon: v.optional(v.string()),
  defaultPrice: v.optional(v.number()),
  defaultCurrency: v.optional(v.string()),
  defaultBillingCycle: v.optional(v.string()),
}).index("by_category", ["category"])
  .searchIndex("search_name", { searchField: "name" })

serviceRequests: defineTable({
  serviceName: v.string(),
  website: v.optional(v.string()),
  requestedBy: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  createdAt: v.number(),
}).index("by_status", ["status"])
```

## Seed Data

~100 services in JSON, organized by category:
- Streaming: Netflix, Hulu, Disney+, HBO Max, etc.
- Music: Spotify, Apple Music, YouTube Music, etc.
- Gaming: Xbox Game Pass, PS Plus, Nintendo Online, etc.
- Productivity: Microsoft 365, Notion, 1Password, etc.
- News: NYT, WSJ, The Athletic, etc.
- Fitness: Peloton, Strava, etc.
- Cloud: iCloud, Dropbox, Google One, etc.

Icons via `https://logo.clearbit.com/{domain}`
