# Task Completion Checklist

When completing a task in this project, verify the following:

## 1. Linting and Type Checking

Run the lint command to check code quality and TypeScript errors:

```bash
bun run lint
```

This runs Biome check + TypeScript type checking on both `src/` and `convex/` directories.

To auto-fix issues:
```bash
bun run lint:fix
```

## 2. Unit Tests (if applicable)

If changes affect testable logic, run unit tests:

```bash
bun run test
```

Tests are located in `tests/` and use Bun's test runner.

## 3. E2E Tests (for UI/integration changes)

For changes affecting user-facing functionality:

```bash
bun run test:e2e
```

E2E tests are in `e2e/` and use Playwright.

## 4. Build Verification

Ensure the production build succeeds:

```bash
bun run build
```

## 5. Code Review Points

Before considering a task complete:

- [ ] No TypeScript errors (run `bun run lint`)
- [ ] Code follows project conventions (see `code_style_and_conventions.md`)
- [ ] Convex functions use proper validators and return types
- [ ] No console.log statements left in code (use `monitoring.ts` for errors)
- [ ] No hardcoded secrets or API keys
- [ ] Changes are backward-compatible or migrations are handled

## 6. Convex-Specific Checks

For Convex changes:
- [ ] Schema changes are additive (avoid breaking migrations)
- [ ] New tables have appropriate indexes defined
- [ ] Auth checks are in place for user-specific data
- [ ] Rate limiting considered for public endpoints

## 7. Security Considerations

- [ ] No XSS vulnerabilities (sanitize user input)
- [ ] API keys are encrypted (use `convex/lib/encryption.ts`)
- [ ] Auth is enforced on sensitive operations
- [ ] No SQL/NoSQL injection (Convex handles this)

## Quick Verification Commands

```bash
# Full verification sequence
bun run lint && bun run test && bun run build
```
