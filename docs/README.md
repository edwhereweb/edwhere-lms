# Edwhere LMS — Engineering Documentation

This folder is the engineering knowledge base for the Edwhere LMS codebase. It is meant to take a new contributor from "I cloned the repo" to "I can make a non-trivial change confidently" without having to read the entire codebase first.

> If you only have 30 minutes, read [`08-onboarding.md`](./08-onboarding.md) first, then [`00-architecture.md`](./00-architecture.md), then dip into the rest as needed.

## How these docs are organised

| #   | Doc                                             | What you'll learn                                                                                                                 |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 00  | [Architecture](./00-architecture.md)            | The mental model. Services, request flow, deployment boundaries, sync vs async paths.                                             |
| 01  | [Developer Guide](./01-developer-guide.md)      | How to run, build, test, lint, debug locally. Env vars and secrets. The local loop.                                               |
| 02  | [Domain Model](./02-domain-model.md)            | The business entities (Course, Chapter, Purchase, Quiz, etc.), their invariants, state transitions, and rules.                    |
| 03  | [Data Model](./03-data-model.md)                | The MongoDB / Prisma schema, indexes, ownership boundaries, growth/cardinality, query patterns.                                   |
| 04  | [Frontend](./04-frontend.md)                    | Route group structure, layouts, role-based UI, components catalog, client/server boundaries.                                      |
| 05  | [Backend API](./05-backend-api.md)              | API route conventions, the full route catalog, server actions, validation, auth helpers.                                          |
| 06  | [Critical Paths](./06-critical-paths.md)        | End-to-end traces for auth, course publish, payment, video upload, file upload, quiz, project submission.                         |
| 07  | [Third-party Integrations](./07-third-party.md) | Clerk, Mux, Cloudflare R2, Razorpay, MongoDB Atlas — what they do, where they are, what can go wrong.                             |
| 08  | [Onboarding Notes](./08-onboarding.md)          | Glossary, sharp edges, common commands cheatsheet, open questions, FAQs.                                                          |
| —   | [R2 Implementation](./R2-IMPLEMENTATION.md)     | Pre-existing deep-dive on the Cloudflare R2 file storage layer (referenced from `AGENTS.md`).                                     |
| —   | [Mobile App Plan](./mobile/README.md)           | Implementation plan for the upcoming React Native student app (scope, backend changes, OpenAPI, RN architecture, open questions). |

## Single source of truth for code conventions

`AGENTS.md` at the repo root is the binding contract for code style, file naming, API patterns, and "what NOT to do". These docs explain _why_ and _how the system works_; `AGENTS.md` defines _how to write code_. If they ever conflict, `AGENTS.md` wins — please open a PR to fix the docs.

## Suggested reading paths

- **I'm onboarding for the first time** → 08 → 00 → 01 → 02 → skim 04/05 → 06.
- **I need to add an API endpoint** → 05 → 02 (for invariants) → 03 (for schema).
- **I need to touch the course consumption flow** → 06 → 04 → 02.
- **I need to add a new file upload type** → [R2-IMPLEMENTATION.md](./R2-IMPLEMENTATION.md) → 07.
- **I'm debugging payments** → 06 (Payment section) → 07 (Razorpay section).
- **I'm chasing a "where does this data come from?" question** → 03 → 05.
