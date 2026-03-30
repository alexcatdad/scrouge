---
title: Implementation Planning
tags:
  - scrouge
  - kb
  - planning
aliases:
  - Delivery Planning
  - Execution Strategy
---

# Implementation Planning

The execution strategy for turning repo truth into delivery.

## Planning Philosophy

Implementation should follow four rules:

1. prefer repo-local docs over invention
2. keep the knowledge base current as part of delivery
3. validate important behavior, not only happy-path demos
4. keep current-state truth separate from deep product or architecture docs

## Source Of Truth Model

Use these layers together:

1. `README.md` when present for overview
2. `CLAUDE.md` and `AGENTS.md` for agent guidance
3. `docs/`, specs, manifests, or plans when present for deeper canonical truth
4. the knowledge base for navigation, readiness, blockers, and decisions

## Slice Definition

A good execution slice should leave behind:

- a clear user or operator outcome
- verification appropriate to the risk
- updated decision, readiness, or blocker notes when the work changes repo truth

## Success Criteria

Planning is doing its job if:

- contributors know what to read first
- important blockers are explicit
- release or production gaps are visible without chat archaeology

