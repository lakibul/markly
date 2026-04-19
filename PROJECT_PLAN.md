# InkBase — Collaborative Smart Editor
### Full-Stack Portfolio Project | Node.js · Express · TypeScript · AI

---

## Project Overview

**InkBase** is a full-stack collaborative markdown/code editor with real-time sync, document versioning, and an embedded AI assistant. It serves as a portfolio-grade project that progressively covers Node.js from beginner to advanced patterns.

**Why this project?**
- Covers nearly every common backend pattern employers look for
- Demonstrates real-time, AI integration, auth, storage, and DevOps
- Ships as something visually impressive and usable
- Each module is an isolated learning milestone

---

## Database Recommendation

### Use: **PostgreSQL + Prisma ORM**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| PostgreSQL + Prisma | Type-safe, industry standard, great for relational data + JSON | Needs a running Postgres server | **Best choice** |
| MongoDB + Mongoose | Flexible schema, easy to start | Loses TypeScript benefits, bad for relational data | Skip |
| SQLite | Zero config | Not production-ready, no real-time support | Only for local dev |
| Supabase (Postgres) | Hosted, has realtime built-in, free tier | Vendor lock-in | Good alternative |

**Recommendation**: PostgreSQL locally via Docker, Supabase for deployment (free tier, no server management). Prisma as the ORM — it generates types from your schema which pairs perfectly with TypeScript.

---

## Core Feature Set

### Phase 1 — Foundation (Beginner)
- [ ] User registration & login (JWT access + refresh tokens)
- [ ] Create, read, update, delete documents
- [ ] Markdown rendering preview
- [ ] Personal dashboard (all your documents)
- [ ] Basic search by title

### Phase 2 — Intermediate
- [ ] Document sharing (public link, view-only vs edit)
- [ ] Folder/workspace organization
- [ ] Document versioning (save history, restore a version)
- [ ] File/image upload to documents (Cloudinary or AWS S3)
- [ ] Tags and filtering
- [ ] Rate limiting & request validation (Zod)

### Phase 3 — Advanced
- [ ] Real-time collaborative editing (WebSockets via Socket.io or Y.js CRDT)
- [ ] Online/offline presence indicators (who is editing)
- [ ] Redis caching (session store, frequently accessed docs)
- [ ] Background jobs (email notifications, cleanup) via BullMQ
- [ ] Full-text search with PostgreSQL `tsvector`

### Phase 4 — AI Feature (Anthropic Claude API)
- [ ] **AI Writing Assistant** — highlight text → "Improve this", "Make shorter", "Fix grammar"
- [ ] **AI Document Summarizer** — generate a summary from the full document
- [ ] **Smart Autocomplete** — continue writing from cursor position
- [ ] **AI Chat Sidebar** — ask questions about the document content
- [ ] Token usage tracking per user (usage limits for free tier)

---

## Technology Stack

### Backend
| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20+ | LTS, native ESM, good performance |
| Framework | Express.js | Lightweight, widely used, good for learning middleware |
| Language | TypeScript 5+ | Type safety, better DX, industry standard |
| ORM | Prisma | Type-safe DB access, great migrations |
| Database | PostgreSQL 16 | Relational + JSONB, full-text search, reliable |
| Cache | Redis (Upstash for hosted) | Session store, rate limiting, pub/sub for real-time |
| Auth | JWT (access + refresh) + bcrypt | No vendor lock-in, teaches auth fundamentals |
| Validation | Zod | Runtime + compile-time safety, pairs with TypeScript |
| Real-time | Socket.io | WebSocket abstraction, rooms, namespaces |
| Queue | BullMQ + Redis | Background job processing |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) | Claude's context window handles large docs well |
| File Storage | Cloudinary or AWS S3 | Image/attachment uploads |
| Email | Nodemailer + Resend (or Sendgrid) | Verification emails, share notifications |
| Logging | Winston + Morgan | Structured logs |
| Testing | Vitest + Supertest | Fast unit/integration tests |
| Docs | Swagger/OpenAPI via `zod-to-openapi` | Auto-generated API docs |

### Frontend (minimal — this is a Node.js focus project)
| Layer | Technology |
|---|---|
| Templating / SPA | React (Vite) or simple EJS if you want server-side rendering |
| Editor | CodeMirror 6 or TipTap (rich text) |
| Real-time client | Socket.io-client |

> **Tip**: You can build just the API and use Postman/Swagger UI as the "frontend" if you want to keep the focus purely on Node.js. Add React later as a bonus.

### DevOps & Tooling
| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local Postgres + Redis without installs |
| ESLint + Prettier | Code quality |
| Husky + lint-staged | Pre-commit hooks |
| dotenv / env validation | Config management |
| PM2 or Railway | Production deployment |

---

## Project Architecture

```
editor/
├── src/
│   ├── config/             # DB, env, redis, logger setup
│   ├── modules/
│   │   ├── auth/           # routes, controller, service, schema
│   │   ├── users/
│   │   ├── documents/
│   │   ├── versions/
│   │   ├── collaboration/  # Socket.io handlers
│   │   ├── ai/             # Claude API integration
│   │   └── uploads/
│   ├── middlewares/        # auth, error handler, rate limiter, validation
│   ├── jobs/               # BullMQ job processors
│   ├── utils/              # helpers, response wrapper, token utils
│   ├── types/              # global TypeScript types/interfaces
│   └── app.ts              # Express app factory
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   └── integration/
├── docker-compose.yml
├── .env.example
└── tsconfig.json
```

**Pattern**: Feature-based (modular) structure. Each module owns its routes, controller, service, and schema. This is the pattern used in most production codebases.

---

## Database Schema (Core Tables)

```
User
  id, email, password_hash, name, avatar_url, plan (free/pro)
  created_at, updated_at

Document
  id, title, content (text), content_html, owner_id (→ User)
  is_public, share_token, folder_id, tags (text[])
  created_at, updated_at

DocumentVersion
  id, document_id (→ Document), content, snapshot_label
  created_by (→ User), created_at

Collaborator
  id, document_id, user_id, role (viewer/editor)

Folder
  id, name, owner_id, parent_folder_id (self-relation for nesting)

AiUsage
  id, user_id, action (summarize/improve/autocomplete), tokens_used, created_at
```

---

## API Design (Key Endpoints)

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout

Documents
  GET    /api/documents              (paginated, search, filter by tag/folder)
  POST   /api/documents
  GET    /api/documents/:id
  PATCH  /api/documents/:id
  DELETE /api/documents/:id
  GET    /api/documents/:id/versions
  POST   /api/documents/:id/share

AI
  POST   /api/ai/improve             (improve selected text)
  POST   /api/ai/summarize           (summarize full document)
  POST   /api/ai/autocomplete        (continue writing)
  POST   /api/ai/chat                (streaming chat about document)

Uploads
  POST   /api/uploads/image

WebSocket Events
  join-document, leave-document
  document-change (broadcast delta)
  cursor-position
  user-presence
```

---

## Learning Milestones (Beginner → Advanced)

### Milestone 1 — Node.js & Express Basics
- Set up Express with TypeScript, `ts-node-dev`, `tsconfig-paths`
- Environment variables with validation (`zod` + dotenv)
- First CRUD routes for documents
- Connect Prisma to PostgreSQL

### Milestone 2 — Auth & Middleware
- JWT access token (15 min) + refresh token (7 day) pattern
- Middleware: `authenticate`, `authorize`, error handler, not-found handler
- Password hashing with bcrypt
- Input validation middleware with Zod schemas

### Milestone 3 — Advanced Querying
- Pagination (`cursor-based` vs `offset-based`)
- Full-text search with Postgres `to_tsvector`
- Filtering, sorting, tag queries
- Prisma relations and transactions

### Milestone 4 — File Uploads & Email
- Multipart form data with Multer
- Upload to Cloudinary / S3
- Send email with Nodemailer on share/invite events

### Milestone 5 — Redis & Caching
- Redis for refresh token storage (revocation list)
- Cache popular public documents with TTL
- Rate limiting per IP + per user with Redis counters

### Milestone 6 — Real-Time (WebSockets)
- Socket.io rooms (one room per document)
- Broadcast document changes to other collaborators
- Presence: show who is currently viewing/editing
- Handle disconnect/reconnect gracefully

### Milestone 7 — Background Jobs
- BullMQ queue setup
- Job: send email notification when document is shared
- Job: clean up orphaned file uploads
- Job: auto-save version snapshot every N minutes of edits

### Milestone 8 — AI Integration
- Anthropic SDK setup, API key management
- Streaming responses (`stream: true`) for chat feature
- Prompt engineering for each AI action
- Token counting and usage tracking per user
- AI rate limiting (N AI calls per day on free plan)

### Milestone 9 — Testing
- Unit tests: service layer (mock Prisma with `jest-mock-extended`)
- Integration tests: API routes with Supertest + test database
- Test coverage report

### Milestone 10 — Production Ready
- Docker Compose for local dev (Postgres + Redis)
- Health check endpoint `/health`
- Structured logging with Winston
- Swagger/OpenAPI docs
- Deploy to Railway or Render

---

## AI Feature: Claude Integration Detail

```typescript
// Example: AI Improve action
POST /api/ai/improve
Body: { documentId: string, selectedText: string, instruction: string }

// Flow:
// 1. Validate user owns or has edit access to document
// 2. Check user's daily AI quota (from AiUsage table)
// 3. Call Claude API with system prompt + selected text
// 4. Stream response back to client via SSE or WebSocket
// 5. Log token usage to AiUsage table
// 6. Return improved text

// Recommended model: claude-sonnet-4-6 (fast, cost-effective, high quality)
// Use streaming for chat feature (feels responsive)
// Use non-streaming for improve/summarize (simpler, atomic result)
```

**AI System Prompt Strategy**:
- Each action has its own focused system prompt
- Pass document title + full content as context for summarize/chat
- Pass only selected text for improve/grammar actions
- Use Anthropic prompt caching for the document context (saves tokens on repeated AI calls on the same document)

---

## Suggested Build Order

```
Week 1: Project setup, DB schema, Auth (register/login/refresh)
Week 2: Document CRUD, folders, tags, search
Week 3: Versioning, sharing, file uploads
Week 4: Redis caching, rate limiting, email
Week 5: WebSockets (real-time collaboration)
Week 6: BullMQ background jobs
Week 7: AI integration (all 4 AI features)
Week 8: Tests, Swagger docs, Docker, deployment
```

---

## Portfolio Showcase Value

This project demonstrates:
- **REST API design** with proper status codes, pagination, filtering
- **Authentication patterns** (JWT dual-token, refresh rotation)
- **Real-time systems** (WebSockets, presence)
- **AI API integration** with streaming and prompt engineering
- **Database design** (relations, versioning, full-text search)
- **Infrastructure patterns** (Redis, queues, caching)
- **Production readiness** (logging, health checks, Docker, tests)
- **TypeScript mastery** across the full backend stack

---

## Quick Start Stack Decision Summary

| Decision | Choice | Reason |
|---|---|---|
| Database | PostgreSQL | Relational + JSONB + full-text search in one |
| ORM | Prisma | Best TypeScript integration |
| Auth | JWT (manual) | Teaches the fundamentals, no magic |
| Real-time | Socket.io | Most widely understood, good docs |
| AI | Anthropic Claude API | Best for text tasks, streaming support, generous context |
| Deployment | Railway | Free tier, supports Postgres + Redis + Node |
| Local infra | Docker Compose | No system-level installs needed |

---

*Generated: 2026-04-19 | Stack versions target Node 20 LTS, TypeScript 5.x, Prisma 5.x*
