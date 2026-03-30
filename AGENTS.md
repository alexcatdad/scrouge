# scrouge - AGENTS.md

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
- Use `CLAUDE.md` when present for project-specific implementation guidance.
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

## Working Style

- Prefer repo-local docs over invention.
- Keep documentation and shipped behavior aligned.
- If the repo has a stronger project-specific instruction file or canonical spec, follow it.
- If you discover a durable delivery pattern, record it in the knowledge base instead of assuming the next agent will infer it.

