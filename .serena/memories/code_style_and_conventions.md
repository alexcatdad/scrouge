# Code Style and Conventions

## General

- **Language**: TypeScript throughout (strict mode)
- **Module System**: ES Modules (`"type": "module"`)
- **Package Manager**: Bun
- **Linting & Formatting**: Biome (replaces ESLint + Prettier)

## TypeScript

- Use TypeScript strict mode
- Prefer type inference where possible
- Unused variables can be prefixed with `_` to suppress warnings
- Explicit `any` is allowed but discouraged
- No unused imports

## React Components

- **Functional components only** - no class components
- Use hooks for state and effects
- Component files use `.tsx` extension
- Place components in `src/components/` directory
- Named exports for components

Example:
```tsx
export function ComponentName({ prop }: { prop: string }) {
  const [state, setState] = useState<string>("");
  return <div>{prop}</div>;
}
```

## Convex Functions

Always use the new function syntax with validators:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const myQuery = query({
  args: { id: v.id("table") },
  returns: v.object({ ... }),
  handler: async (ctx, args) => {
    // ...
  }
});

export const myMutation = mutation({
  args: { ... },
  returns: v.null(),
  handler: async (ctx, args) => {
    // ...
  }
});
```

**Important Convex patterns:**
- Use `ctx.db` for database access in queries/mutations
- Actions cannot access database directly - use `ctx.runQuery`/`ctx.runMutation`
- Define indexes in schema for efficient queries
- Use `v.id("tableName")` for foreign key references
- Always validate with Convex validators (`v.string()`, `v.number()`, etc.)

## File Organization

- **Frontend code**: `src/`
- **Backend code**: `convex/`
- **Utilities/libs**: `src/lib/` and `convex/lib/`
- **Tests**: `tests/` (unit), `e2e/` (E2E)

## Naming Conventions

- **Files**: camelCase for TypeScript files, PascalCase for React components
- **Functions**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: camelCase (not SCREAMING_SNAKE_CASE)
- **Convex validators**: Suffix with `Validator` (e.g., `billingCycleValidator`)

## Environment Variables

- Client-side env vars must be prefixed with `VITE_`
- Use `src/lib/env.ts` for type-safe access via t3-env
- Access via `env.VITE_CONVEX_URL` (not `import.meta.env` directly)

## CSS/Styling

- Use Tailwind CSS v4
- Utility-first approach
- Use `clsx` and `tailwind-merge` for conditional classes

## ESLint Rules

Key relaxed rules for easier TypeScript adoption:
- Unused vars with `_` prefix are allowed
- Explicit `any` is allowed (`no-explicit-any: off`)
- Async functions without await are allowed (for Convex handlers)
- React hooks rules enforced
