# Folio — Complete Architecture & Learning Guide
### Every Route · Every Component · Every Pattern · Explained

---

## Table of Contents

1. [Project Architecture Overview](#1-project-architecture-overview)
2. [Backend: Folder Structure Deep Dive](#2-backend-folder-structure-deep-dive)
3. [All API Routes — Complete Reference](#3-all-api-routes--complete-reference)
4. [Middleware Pipeline — Step by Step](#4-middleware-pipeline--step-by-step)
5. [Database Schema — Tables & Relations](#5-database-schema--tables--relations)
6. [Backend Utilities Explained](#6-backend-utilities-explained)
7. [Frontend: React Architecture](#7-frontend-react-architecture)
8. [React Component Tree](#8-react-component-tree)
9. [State Management with Zustand](#9-state-management-with-zustand)
10. [React Pages — What Each One Does](#10-react-pages--what-each-one-does)
11. [React Components — Purpose & Props](#11-react-components--purpose--props)
12. [Data Flow: Frontend ↔ Backend](#12-data-flow-frontend--backend)
13. [Authentication Flow — Complete](#13-authentication-flow--complete)
14. [Document Lifecycle — Create to Share](#14-document-lifecycle--create-to-share)
15. [Error Handling Strategy](#15-error-handling-strategy)
16. [Why Each Technology Was Chosen](#16-why-each-technology-was-chosen)

---

## 1. Project Architecture Overview

```
editor/
├── server/          ← Node.js + Express + TypeScript (API)
├── client/          ← React + Vite + TypeScript (UI)
├── docker-compose.yml    ← PostgreSQL in Docker
├── PROJECT_PLAN.md
├── LEARN.md
├── CODEBASE_EXPLAINED.md
└── ARCHITECTURE.md  ← (you are here)
```

### How the Two Sides Relate

```
┌─────────────────────────────────┐     HTTP/JSON      ┌─────────────────────────────────┐
│         CLIENT (React)          │ ◄────────────────► │        SERVER (Express)          │
│                                 │                     │                                 │
│  Browser runs this              │   POST /api/auth    │  Node.js runs this              │
│  Users see and interact here    │   GET  /api/docs    │  Talks to the database          │
│  Port: 5173 (dev)               │                     │  Port: 4000 (dev)               │
└─────────────────────────────────┘                     └─────────────────────────────────┘
                                                                       │
                                                                       ▼
                                                        ┌─────────────────────────────────┐
                                                        │    PostgreSQL (Docker)           │
                                                        │  All data stored here            │
                                                        │  Port: 5432                      │
                                                        └─────────────────────────────────┘
```

---

## 2. Backend: Folder Structure Deep Dive

```
server/src/
│
├── server.ts              ← Entry point. Boots Node.js, connects DB, starts listening
├── app.ts                 ← Express app setup. Middleware chain + routes mounted
│
├── config/                ← Configuration (runs once at startup)
│   ├── env.ts             ← Reads .env file, validates all required variables exist
│   ├── database.ts        ← Creates ONE Prisma instance shared by all requests
│   └── cloudinary.ts      ← Configures Cloudinary v2 with API credentials
│
├── middlewares/           ← Functions that run on EVERY request before your code
│   ├── authenticate.ts    ← Reads JWT from header, attaches user to req.user
│   ├── validate.ts        ← Runs Zod schema against req.body/params/query
│   ├── rateLimiter.ts     ← Counts requests per IP, blocks if too many
│   └── errorHandler.ts    ← Catches ALL errors in the app, sends clean JSON response
│
├── utils/                 ← Helper functions used everywhere
│   ├── AppError.ts        ← Custom Error class with statusCode attached
│   ├── asyncHandler.ts    ← Wraps async functions so errors auto-go to errorHandler
│   ├── token.ts           ← Signs and verifies JWT tokens
│   ├── response.ts        ← sendSuccess(), sendError(), sendPaginated() helpers
│   └── pagination.ts      ← Converts page/limit query params to skip/take for Prisma
│
├── types/
│   └── index.ts           ← Extends Express Request type to include req.user
│
└── modules/               ← Feature folders — each feature is fully self-contained
    ├── auth/
    │   ├── auth.schema.ts      ← Zod schemas: what does valid register/login look like?
    │   ├── auth.service.ts     ← Business logic: hash passwords, generate tokens, verify
    │   ├── auth.controller.ts  ← HTTP handlers: read req → call service → send res
    │   └── auth.routes.ts      ← URL definitions: POST /register, POST /login, etc.
    │
    ├── users/
    │   ├── user.service.ts     ← Get profile, update name/avatar
    │   ├── user.controller.ts
    │   └── user.routes.ts
    │
    ├── documents/
    │   ├── document.schema.ts  ← Zod: create/update/list validation rules
    │   ├── document.service.ts ← CRUD, search, sharing, collaborators, tags
    │   ├── document.controller.ts
    │   └── document.routes.ts
    │
    ├── folders/
    │   ├── folder.service.ts   ← CRUD, nested folders, ownership check
    │   ├── folder.controller.ts
    │   └── folder.routes.ts
    │
    ├── versions/
    │   ├── version.service.ts  ← List history, save manual snapshot, restore version
    │   ├── version.controller.ts
    │   └── version.routes.ts
    │
    └── uploads/
        ├── upload.service.ts   ← Save attachment record to DB, delete from Cloudinary
        ├── upload.controller.ts
        └── upload.routes.ts    ← Multer (memory) → stream to Cloudinary → save to DB
```

### Why This Structure?

Each module has exactly 4 files: `schema → service → controller → routes`

```
Someone reports a bug: "Login doesn't work"
  → Open modules/auth/
  → Is the URL wrong?       → auth.routes.ts
  → Is the validation wrong? → auth.schema.ts
  → Is the logic wrong?      → auth.service.ts
  → Is the response wrong?   → auth.controller.ts

You always know exactly which file to open.
```

---

## 3. All API Routes — Complete Reference

Base URL: `http://localhost:4000/api`

### AUTH ROUTES — `/api/auth`
> All auth routes have strict rate limiting: max 10 requests per 15 minutes per IP

| Method | Path | Auth? | Body Required | What It Does |
|--------|------|-------|---------------|--------------|
| `POST` | `/auth/register` | No | `name, email, password` | Creates account, returns tokens + user |
| `POST` | `/auth/login` | No | `email, password` | Verifies credentials, returns tokens + user |
| `POST` | `/auth/refresh` | No | `refreshToken` | Issues new accessToken without re-login |
| `POST` | `/auth/logout` | No | `refreshToken` | Deletes refreshToken from DB (revokes it) |

**Validation rules (Zod):**
```
register:
  name     → min 2 chars, max 100
  email    → valid email format
  password → min 8 chars, must have 1 uppercase + 1 number

login:
  email    → valid email format
  password → required (any string)

refresh / logout:
  refreshToken → required string
```

---

### USER ROUTES — `/api/users`
> All routes require: `Authorization: Bearer <accessToken>` header

| Method | Path | Auth? | Body | What It Does |
|--------|------|-------|------|--------------|
| `GET` | `/users/me` | Yes | — | Returns current user profile + document/folder counts |
| `PATCH` | `/users/me` | Yes | `name?, avatarUrl?` | Updates name or avatar URL |

---

### DOCUMENT ROUTES — `/api/documents`

| Method | Path | Auth? | Input | What It Does |
|--------|------|-------|-------|--------------|
| `GET` | `/documents` | Yes | Query params | List your documents (paginated, searchable, filterable) |
| `POST` | `/documents` | Yes | Body | Create a new document |
| `GET` | `/documents/:id` | Yes | — | Get one document with folder, collaborators, attachments |
| `PATCH` | `/documents/:id` | Yes | Body | Update title/content/tags/folder — auto-saves version if content changes |
| `DELETE` | `/documents/:id` | Yes | — | Permanently delete document and all its data |
| `POST` | `/documents/:id/share` | Yes | `isPublic: boolean` | Toggle public sharing, generates/removes share token |
| `GET` | `/documents/shared/:token` | **No** | — | Public read-only view by share token |
| `POST` | `/documents/:id/collaborators` | Yes | `email, role` | Invite a user by email as VIEWER or EDITOR |
| `DELETE` | `/documents/:id/collaborators/:userId` | Yes | — | Remove a collaborator |

**List documents — Query parameters:**
```
GET /api/documents?page=1&limit=20&search=react&folderId=clx123&tag=tutorial&sort=updatedAt&order=desc

page     → page number (default: 1)
limit    → items per page, max 50 (default: 20)
search   → searches document title (case-insensitive)
folderId → filter by folder ID (pass "null" for root documents)
tag      → filter by exact tag name
sort     → "updatedAt" | "createdAt" | "title" (default: updatedAt)
order    → "asc" | "desc" (default: desc)
```

---

### FOLDER ROUTES — `/api/folders`

| Method | Path | Auth? | Body | What It Does |
|--------|------|-------|------|--------------|
| `GET` | `/folders` | Yes | — | All your folders with children + document count |
| `POST` | `/folders` | Yes | `name, parentId?` | Create folder (optionally nested inside another) |
| `PATCH` | `/folders/:id` | Yes | `name` | Rename folder |
| `DELETE` | `/folders/:id` | Yes | — | Delete folder (documents inside move to root, not deleted) |

---

### VERSION ROUTES — `/api/versions`

| Method | Path | Auth? | Body | What It Does |
|--------|------|-------|------|--------------|
| `GET` | `/versions/:documentId` | Yes | Query `page, limit` | List all saved versions of a document, newest first |
| `POST` | `/versions/:documentId` | Yes | `label?` | Manually save current content as a named version |
| `POST` | `/versions/:versionId/restore` | Yes | — | Restore document to this version (current content saved first) |

---

### UPLOAD ROUTES — `/api/uploads`

| Method | Path | Auth? | Body | What It Does |
|--------|------|-------|------|--------------|
| `POST` | `/uploads/:documentId` | Yes | `multipart/form-data: file` | Upload image/PDF to Cloudinary, save record to DB |
| `DELETE` | `/uploads/:attachmentId` | Yes | — | Delete from Cloudinary + remove DB record |

**Allowed file types:** jpg, jpeg, png, gif, webp, pdf, svg
**Max file size:** 10 MB

---

### HEALTH CHECK

| Method | Path | Auth? | What It Does |
|--------|------|-------|--------------|
| `GET` | `/health` | No | Returns `{ status: "ok", timestamp }` — used by monitoring tools |

---

## 4. Middleware Pipeline — Step by Step

Every single HTTP request passes through this chain in order:

```
Incoming Request
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. helmet()                                                     │
│     Adds HTTP security headers to every response:               │
│     - X-Content-Type-Options: nosniff                           │
│     - X-Frame-Options: DENY (prevents clickjacking)             │
│     - Strict-Transport-Security (forces HTTPS in production)    │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. cors({ origin: "http://localhost:5173" })                   │
│     Browsers block requests to different origins by default.    │
│     CORS tells the browser: "Yes, this React app is allowed."   │
│     Without this, every Axios request would fail in browser.    │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. morgan("dev")   [development only]                          │
│     Logs every request to the terminal:                         │
│     POST /api/auth/login 200 45ms                               │
│     GET  /api/documents  200 12ms                               │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. express.json({ limit: "10mb" })                             │
│     Reads the raw request body and parses it as JSON.           │
│     Result: req.body = { email: "...", password: "..." }        │
│     Without this: req.body = undefined                          │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. apiLimiter  (100 requests / minute / IP)                    │
│     Tracks request count per IP address in memory.              │
│     If exceeded: returns 429 Too Many Requests immediately.     │
│     Prevents bot abuse and DDoS.                                │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Router matching                                             │
│     Express checks: does this URL match any registered route?   │
│     /api/auth/*   → authRouter                                  │
│     /api/documents/* → documentRouter                           │
│     No match      → 404 handler                                 │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼ (for auth routes)
┌─────────────────────────────────────────────────────────────────┐
│  7. authLimiter  (10 requests / 15 minutes / IP)                │
│     Stricter limit specifically for login/register endpoints.   │
│     Prevents brute-force password attacks.                      │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼ (for protected routes)
┌─────────────────────────────────────────────────────────────────┐
│  8. authenticate  (only on protected routes)                    │
│     Reads: Authorization: Bearer eyJhbG...                      │
│     Verifies JWT signature with JWT_ACCESS_SECRET               │
│     Decodes payload: { userId, email }                          │
│     Attaches to req.user = { userId, email }                    │
│     If missing/invalid: returns 401 Unauthorized                │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼ (for routes with validation)
┌─────────────────────────────────────────────────────────────────┐
│  9. validate(schema)                                            │
│     Runs Zod schema against req.body (or req.query/params)      │
│     If invalid: returns 400 with list of field errors           │
│     If valid: replaces req.body with cleaned/parsed data        │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. Your Controller                                            │
│      Finally runs your actual code                              │
└─────────────────────────────────────────────────────────────────┘
       │
       │  (if error thrown anywhere above)
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  11. errorHandler  (catches everything)                         │
│      AppError     → uses its statusCode + message               │
│      Prisma P2002 → 409 "record already exists"                 │
│      Prisma P2025 → 404 "record not found"                      │
│      JWT errors   → 401 "invalid/expired token"                 │
│      Unknown      → 500 "internal server error"                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema — Tables & Relations

```
┌─────────────┐       ┌──────────────────┐       ┌────────────────────┐
│    users    │       │    documents      │       │ document_versions  │
│─────────────│       │──────────────────│       │────────────────────│
│ id (PK)     │──┐    │ id (PK)          │──┐    │ id (PK)            │
│ email       │  │    │ title            │  │    │ document_id (FK)──►│
│ password_   │  └───►│ content          │  │    │ content            │
│   hash      │  owns │ owner_id (FK)    │  │    │ label              │
│ name        │       │ folder_id (FK)──►│  │    │ created_by (FK)──► │
│ avatar_url  │       │ is_public        │  │    │ created_at         │
│ created_at  │       │ share_token      │  │    └────────────────────┘
│ updated_at  │       │ tags (array)     │  │
└─────────────┘       │ created_at       │  │    ┌────────────────────┐
       │              │ updated_at       │  └───►│  collaborators     │
       │              └──────────────────┘       │────────────────────│
       │                      │                  │ id (PK)            │
       │              ┌───────┘                  │ document_id (FK)   │
       │              ▼                          │ user_id (FK)       │
       │       ┌─────────────┐                   │ role (VIEWER/EDITOR│
       │       │   folders   │                   └────────────────────┘
       │       │─────────────│
       └──────►│ id (PK)     │                   ┌────────────────────┐
          owns │ name        │                   │   attachments      │
               │ owner_id(FK)│                   │────────────────────│
               │ parent_id   │◄── self-relation  │ id (PK)            │
               │ created_at  │    (nested folders│ document_id (FK)   │
               └─────────────┘                   │ filename           │
                                                  │ url (Cloudinary)   │
       ┌──────────────────┐                       │ public_id          │
       │  refresh_tokens  │                       │ mime_type          │
       │──────────────────│                       │ size               │
       │ id (PK)          │                       └────────────────────┘
       │ token (unique)   │
       │ user_id (FK)─────┤
       │ expires_at       │
       └──────────────────┘
```

### Relation Types Explained

| Relation | From → To | Type | Meaning |
|---|---|---|---|
| User → Document | 1 → Many | One-to-Many | One user owns many documents |
| User → Folder | 1 → Many | One-to-Many | One user owns many folders |
| Document → Folder | Many → 1 | Many-to-One | Many docs can be in one folder |
| Document → Version | 1 → Many | One-to-Many | One doc has many saved versions |
| Document → Collaborator | 1 → Many | One-to-Many | One doc can have many collaborators |
| Document → Attachment | 1 → Many | One-to-Many | One doc can have many files |
| Folder → Folder | 1 → Many | Self-relation | A folder can contain other folders |
| User → RefreshToken | 1 → Many | One-to-Many | A user can be logged in from multiple devices |

### Cascade Rules (What happens when you delete)

```
Delete a User    → deletes all their documents, folders, refresh tokens
Delete a Document → deletes all its versions, collaborators, attachments
Delete a Folder  → documents inside become "root" (folderId = null), NOT deleted
```

---

## 6. Backend Utilities Explained

### `AppError.ts` — Custom Error Class

```typescript
// Without AppError — inconsistent, messy
throw new Error("Not found")              // no status code!
res.status(404).json({ message: "..." }) // response in wrong place

// With AppError — clean
throw new AppError("Document not found.", 404)
// errorHandler catches it automatically and sends the right response
```

**How it travels:**
```
Service throws AppError
    → asyncHandler catches it
    → passes to next(error)
    → errorHandler reads err.statusCode + err.message
    → sends JSON response
```

---

### `asyncHandler.ts` — The Error Forwarder

```typescript
// Problem: Express doesn't automatically catch async errors
router.get("/", async (req, res, next) => {
  try {
    const docs = await documentService.list() // if this throws...
    res.json(docs)
  } catch (err) {
    next(err) // ...you must manually forward to errorHandler
  }
})

// asyncHandler removes the try/catch from every single controller:
router.get("/", asyncHandler(async (req, res) => {
  const docs = await documentService.list() // if this throws, auto-forwarded
  res.json(docs)
}))
```

---

### `token.ts` — JWT Sign & Verify

```typescript
// Signing = creating a token
// The token contains: { userId, email, iat (issued at), exp (expires at) }
// Signed with a secret — only the server with the secret can verify it

signAccessToken({ userId, email })
// Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbHguLi4iLCJlbWFpbCI..."
// This is base64 encoded, NOT encrypted. Anyone can decode and read the payload.
// BUT they cannot forge a new token without the secret.

verifyAccessToken("eyJhbG...")
// Returns: { userId: "clx...", email: "john@example.com" }
// Throws if: token is expired, token is tampered with, wrong secret
```

---

### `response.ts` — Consistent API Responses

Every response in this project follows the same shape:

```json
// Success
{ "success": true, "message": "Login successful.", "data": { ... } }

// Paginated success
{ "success": true, "message": "Success", "data": [...], "meta": { "page": 1, "limit": 20, "total": 47, "totalPages": 3 } }

// Error
{ "success": false, "message": "Email already in use." }

// Validation error
{ "success": false, "message": "Validation failed.", "errors": [{ "field": "email", "message": "Invalid email" }] }
```

**Why consistent responses?** The React client knows exactly what shape to expect. No guessing.

---

### `pagination.ts` — How Pagination Works

```
User requests: GET /api/documents?page=2&limit=20

getPagination(2, 20):
  page = 2
  limit = 20
  skip = (2-1) * 20 = 20   ← skip the first 20 results

Prisma query:
  findMany({ skip: 20, take: 20 })  → returns items 21-40

Response meta:
  { page: 2, limit: 20, total: 47, totalPages: 3 }
```

---

## 7. Frontend: React Architecture

```
client/src/
│
├── main.tsx           ← Mounts React into <div id="root"> in index.html
├── App.tsx            ← Defines all URL routes using React Router
├── index.css          ← Global styles + Tailwind imports
│
├── types/
│   └── index.ts       ← Shared TypeScript interfaces (User, Document, Folder, etc.)
│
├── services/          ← API communication layer (Axios calls)
│   ├── api.ts         ← Axios instance with auth headers + auto token refresh
│   ├── auth.service.ts
│   ├── document.service.ts
│   ├── folder.service.ts
│   └── version.service.ts
│
├── store/             ← Global state (Zustand)
│   ├── authStore.ts   ← Who is logged in? What are the tokens?
│   └── documentStore.ts ← What documents are loaded? What is currently open?
│
├── components/        ← Reusable UI pieces
│   ├── ui/            ← Generic (not tied to any feature)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── layout/        ← App shell (nav, sidebar, protected wrapper)
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── AppLayout.tsx
│   └── documents/     ← Document-specific components
│       └── DocumentCard.tsx
│
└── pages/             ← One file per route
    ├── auth/
    │   ├── LoginPage.tsx
    │   └── RegisterPage.tsx
    ├── DashboardPage.tsx
    ├── EditorPage.tsx
    └── SharedDocumentPage.tsx
```

### The 3-Layer Frontend Architecture

```
pages/           ← What the user sees for each URL
    │ uses
    ▼
components/      ← Reusable visual pieces
    │ reads/writes
    ▼
store/           ← Global state (Zustand)
    │ calls
    ▼
services/        ← API communication
    │ HTTP
    ▼
server (Express API)
```

---

## 8. React Component Tree

This shows which component contains which, and what data flows where.

```
main.tsx
└── BrowserRouter
    └── App.tsx  (defines routes)
        │
        ├── /login    → LoginPage
        ├── /register → RegisterPage
        ├── /shared/:token → SharedDocumentPage
        │
        └── AppLayout  (checks auth, renders shell)
            ├── Navbar
            │   ├── reads: user (from authStore)
            │   └── calls: logout() (from authStore)
            │
            ├── Sidebar
            │   ├── reads: folders, documents, selectedFolderId, selectedTag
            │   └── calls: setSelectedFolder(), setSelectedTag(), fetchDocuments()
            │
            └── <Outlet />  (renders the matched child route here)
                ├── /dashboard → DashboardPage
                │   ├── reads: documents, isLoading, total
                │   ├── calls: fetchDocuments(), fetchFolders(), createDocument(), deleteDocument()
                │   └── renders: DocumentCard × N
                │       ├── reads: doc (prop passed from DashboardPage)
                │       └── calls: onDelete (prop passed from DashboardPage)
                │
                └── /editor/:id → EditorPage
                    ├── reads: currentDoc (from documentStore)
                    ├── calls: fetchDocument(), updateCurrentDoc(), saveDocument()
                    └── renders:
                        ├── MDEditor (markdown editor library)
                        ├── Modal (Share)  ← from ui/Modal
                        └── Modal (Versions) ← from ui/Modal
```

---

## 9. State Management with Zustand

### Why Zustand Instead of useState Everywhere?

```
Problem: user data needed in 5 different places
  Navbar    → needs: user.name, logout()
  Sidebar   → needs: isAuthenticated (to render or not)
  Dashboard → needs: user.id (to fetch their documents)
  Editor    → needs: user.id (ownership check)
  AppLayout → needs: isAuthenticated (redirect if not logged in)

Option A: useState in App.tsx → pass down as props
  App → AppLayout → Navbar (needs user)     ← 2 levels of props
  App → AppLayout → Sidebar                 ← 2 levels
  App → AppLayout → DashboardPage           ← 2 levels
  App → AppLayout → DashboardPage → Editor  ← 3 levels
  This is called "prop drilling" — messy, hard to maintain

Option B: Zustand store
  Any component reads it directly:
  const { user, logout } = useAuthStore()
  No prop passing needed at all. ✅
```

### authStore — What It Stores

```typescript
{
  // State
  user: User | null          // the logged-in user object (or null)
  accessToken: string | null // the short-lived JWT
  refreshToken: string | null // the long-lived JWT
  isAuthenticated: boolean   // derived flag (true if user is not null)
  isLoading: boolean         // true while login/register API call is happening

  // Actions
  login(email, password)     // calls API, saves tokens, updates state
  register(name, email, pwd) // calls API, saves tokens, updates state
  logout()                   // calls API to revoke token, clears state
  setUser(user)              // update user profile without re-login
}
```

**Persisted to localStorage** via Zustand's `persist` middleware:
- On page refresh → state is restored from localStorage automatically
- User stays logged in across refreshes

### documentStore — What It Stores

```typescript
{
  // State
  documents: Document[]      // list of documents shown in dashboard
  currentDoc: Document | null // document currently open in editor
  folders: Folder[]          // all user's folders (for sidebar)
  total: number              // total documents matching current filter
  page: number               // current page number
  totalPages: number         // total pages available
  isLoading: boolean         // true while fetching
  searchQuery: string        // current search text
  selectedFolderId: string | null  // currently selected folder filter
  selectedTag: string | null // currently selected tag filter

  // Actions
  fetchDocuments(params?)    // fetch document list with current filters
  fetchDocument(id)          // fetch single document for editor
  fetchFolders()             // fetch all folders for sidebar
  createDocument(title, folderId?) // create + add to list
  updateCurrentDoc(updates)  // update local state immediately (optimistic)
  saveDocument(id, content)  // sync to server
  deleteDocument(id)         // delete + remove from list
  setSearchQuery(q)          // update search, triggers refetch
  setSelectedFolder(id)      // update folder filter, triggers refetch
  setSelectedTag(tag)        // update tag filter, triggers refetch
}
```

---

## 10. React Pages — What Each One Does

### `LoginPage.tsx`

**URL:** `/login`
**Purpose:** Collect email + password, authenticate user

```
State used:
  form: { email, password }  → local useState (only this page needs it)
  errors: {}                 → local useState (field-level error display)
  isLoading                  → from authStore (disable button while loading)

What happens on submit:
  1. e.preventDefault() → stops browser from reloading the page
  2. authStore.login(email, password) → calls API → saves tokens → updates state
  3. navigate('/dashboard') → redirects to dashboard
  4. If error → toast.error() + show field error

Components used:
  <Input />    → email field with Mail icon
  <Input />    → password field with Lock icon
  <Button />   → submit button with isLoading prop
```

---

### `RegisterPage.tsx`

**URL:** `/register`
**Purpose:** Create new account

```
Same pattern as LoginPage but with name field.
Calls authStore.register() instead of authStore.login()
```

---

### `DashboardPage.tsx`

**URL:** `/dashboard`
**Purpose:** Show all documents with search, filter, create, delete

```
State used:
  view: "grid" | "list"     → local useState (layout toggle)
  showNewDoc: boolean        → local useState (modal visibility)
  newTitle: string           → local useState (new doc title input)
  isCreating: boolean        → local useState (button loading state)
  searchInput: string        → local useState (what user typed in search box)

  documents, isLoading, total → from documentStore (server data)
  fetchDocuments, fetchFolders, createDocument, deleteDocument → from documentStore

useEffect hooks:
  1. On mount: fetchDocuments() + fetchFolders()
  2. On searchInput change: debounce 400ms → setSearchQuery() + fetchDocuments()

Key interactions:
  Search → debounce → API call → documents update → re-render
  "New Document" button → Modal opens → type title → Enter/Create → API → navigate to editor
  Delete button on card → confirm() → API delete → remove from list

Components used:
  <DocumentCard />  × N     → each document in the grid
  <Modal />                 → "New Document" form
  <Button />                → various actions
```

---

### `EditorPage.tsx`

**URL:** `/editor/:id`
**Purpose:** Full markdown editor with auto-save, sharing, version history

```
URL params:
  id → document ID from URL (e.g., /editor/clx123)
  useParams() → const { id } = useParams()

State used:
  isSaving: boolean          → local (shows "Saving..." in toolbar)
  lastSaved: Date | null     → local (shows "Saved 2 minutes ago")
  showShare: boolean         → local (share modal visibility)
  showVersions: boolean      → local (version history modal visibility)
  versions: DocumentVersion[]→ local (loaded on demand, not stored globally)
  shareLink: string          → local (generated share URL)
  copied: boolean            → local (copy button feedback)
  tagInput: string           → local (new tag being typed)

  currentDoc → from documentStore (the full document object)
  fetchDocument, updateCurrentDoc, saveDocument → from documentStore

Auto-save logic:
  handleContentChange(value):
    1. updateCurrentDoc({ content: value })   → instant local update
    2. clearTimeout(saveTimerRef.current)      → reset the timer
    3. setTimeout(2000ms):                     → 2 seconds after typing stops
       → setIsSaving(true)
       → saveDocument(id, value)              → API call
       → setLastSaved(new Date())
       → setIsSaving(false)

  This is called "debouncing":
  User types "Hello World"
    H → timer reset
    e → timer reset
    l → timer reset
    l → timer reset
    o → timer reset
    [stops typing for 2 seconds]
    → SAVE FIRES ONCE (not 5 times)

Version history:
  loadVersions() → GET /api/versions/:id → setVersions(result)
  handleRestoreVersion(versionId):
    → confirm dialog
    → POST /api/versions/:versionId/restore
    → updateCurrentDoc({ content: restored content })

Tag management:
  handleAddTag():
    → update local state immediately
    → PATCH /api/documents/:id with new tags array

  handleRemoveTag(tag):
    → filter tag out
    → PATCH /api/documents/:id with updated tags

Components used:
  <MDEditor />    → the actual markdown editor (library: @uiw/react-md-editor)
  <Modal />       → Share modal
  <Modal />       → Version history modal
  <Button />      → Save, Share, History buttons
```

---

### `SharedDocumentPage.tsx`

**URL:** `/shared/:token`
**Purpose:** Public read-only view, no authentication needed

```
URL params:
  token → the share token stored in DB

State used:
  doc: Document | null       → local useState
  loading: boolean           → local useState
  error: string              → local useState

useEffect on mount:
  documentService.getByShareToken(token)
    → GET /api/documents/shared/:token  (no auth header)
    → setDoc(result)
    OR setError("Document not found")

Renders:
  MDEditor.Markdown (preview-only mode, no edit)
  Document title + last updated time
```

---

## 11. React Components — Purpose & Props

### `Button.tsx`

**Purpose:** Single reusable button for the entire app

```typescript
Props:
  variant: "primary" | "secondary" | "danger" | "ghost"
           primary   → blue filled (main actions)
           secondary → white with border (cancel, secondary actions)
           danger    → red filled (delete actions)
           ghost     → transparent (icon buttons)

  size: "sm" | "md" | "lg"

  isLoading: boolean
           → disables button + shows spinning loader icon
           → prevents double-submitting forms

  leftIcon: React.ReactNode
           → any icon placed before the text

Usage examples:
  <Button>Save</Button>                                     → blue, medium
  <Button variant="danger" size="sm">Delete</Button>        → red, small
  <Button isLoading={isSaving} leftIcon={<Save size={14}/>}>Save</Button>
  <Button variant="secondary" onClick={onClose}>Cancel</Button>
```

---

### `Input.tsx`

**Purpose:** Labeled input field with error display

```typescript
Props:
  label: string       → text above the input
  error: string       → red text below the input (validation error)
  leftIcon: ReactNode → icon inside input on the left

Why this component?
  Without it, every input needs:
    <label>Email</label>
    <input className="border rounded focus:ring-2 ..." />
    {error && <p className="text-red-500">{error}</p>}

  With it, you write:
    <Input label="Email" error={errors.email} leftIcon={<Mail />} />
  Much cleaner, consistent across the whole app.
```

---

### `Modal.tsx`

**Purpose:** Overlay dialog for forms and confirmations

```typescript
Props:
  isOpen: boolean   → whether the modal is visible
  onClose: () => void → called when clicking backdrop or pressing Escape
  title: string     → heading inside the modal
  size: "sm" | "md" | "lg"

Key technical detail — React Portal:
  Normally, components render inside their parent in the DOM tree.
  Modal uses createPortal(content, document.body) to render
  DIRECTLY under <body> regardless of where Modal is used in JSX.

  Why? Parent elements with overflow:hidden or z-index would clip/hide
  the modal without a portal. The portal escapes those constraints.

Keyboard support:
  useEffect listens for "Escape" key → calls onClose()
  Standard accessibility behavior.
```

---

### `AppLayout.tsx`

**Purpose:** Protected route wrapper — the app shell

```typescript
How it works:
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  // If not logged in, redirect. No further rendering.

  return (
    <div> [Navbar] [Sidebar] [<Outlet />] </div>
  )

<Outlet /> is React Router's slot — it renders whatever child route matched.
  URL /dashboard → <Outlet /> renders <DashboardPage />
  URL /editor/123 → <Outlet /> renders <EditorPage />

This means Navbar and Sidebar are rendered ONCE, not re-created on each route.
Navigation between dashboard and editor doesn't re-mount the shell.
```

---

### `Sidebar.tsx`

**Purpose:** Navigation panel — folders + tags

```
State reads (from documentStore):
  folders               → list of all folders
  selectedFolderId      → which folder is currently active
  selectedTag           → which tag is currently active
  documents             → used to extract all unique tags

Local state:
  newFolderName: string → controlled input for creating folders
  showInput: boolean    → toggle the "new folder" input visibility

Interactions:
  Click folder → setSelectedFolder(id) → fetchDocuments() → dashboard updates
  Click tag    → setSelectedTag(tag)   → fetchDocuments() → dashboard updates
  Click "+"    → showInput = true → type name → Enter → create folder → fetchFolders()

Tag generation:
  allTags = [...new Set(documents.flatMap(d => d.tags))]
  This collects all tags from all documents, removes duplicates.
  Rendered as clickable pills.
```

---

### `DocumentCard.tsx`

**Purpose:** One card in the document grid

```
Props:
  doc: Document   → the document data
  onDelete: (id) => void  → called when trash icon clicked

Renders:
  - Title (link to /editor/:id)
  - Public/Private icon (Globe or Lock)
  - First 3 tags as pills
  - Last updated time (date-fns formatDistanceToNow → "2 hours ago")
  - Folder name if assigned
  - Counts for versions, collaborators, attachments

Trash button:
  Only visible on hover (opacity-0 group-hover:opacity-100)
  onClick: e.preventDefault() → stops the Link from firing → calls onDelete
```

---

## 12. Data Flow: Frontend ↔ Backend

### Axios Instance Setup (`services/api.ts`)

```
Every API call goes through one Axios instance:

axios.create({ baseURL: "/api" })

Request interceptor (runs before every request):
  → reads localStorage.getItem("accessToken")
  → adds: Authorization: Bearer eyJhbG...
  → every protected API call is automatically authenticated

Response interceptor (runs after every response):
  On 401 (token expired):
    → checks if a refresh is already happening
    → calls POST /api/auth/refresh with refreshToken
    → gets new accessToken
    → saves to localStorage
    → retries the ORIGINAL request with new token
    → user never sees a login prompt

  If refresh fails:
    → clears tokens from localStorage
    → redirects to /login
```

### Service Layer Pattern

```typescript
// All services follow this pattern:
const documentService = {
  async list(params) {
    const { data } = await api.get("/documents", { params })
    return data  // { success, data: [...], meta: {...} }
  }
}

// Component calls service:
const result = await documentService.list({ page: 1, search: "react" })
// result.data → array of documents
// result.meta → pagination info
```

---

## 13. Authentication Flow — Complete

### First Login (Step by Step)

```
1. User opens /login
   → AppLayout checks isAuthenticated = false → allows /login to render

2. User submits form
   → authStore.login(email, password) called

3. Axios POST /api/auth/login
   → request interceptor: no token yet, skips Authorization header

4. Express receives request:
   → rateLimiter: OK
   → validate(loginSchema): checks email format + password present
   → authController.login() called
   → authService.login():
       prisma.user.findUnique({ where: { email } })
       bcrypt.compare(password, user.passwordHash)
       signAccessToken({ userId, email })   → 15 min token
       signRefreshToken({ userId, email })  → 7 day token
       prisma.refreshToken.create(...)      → stored in DB
       return { user, accessToken, refreshToken }

5. Response received by Axios
   → authStore saves to localStorage + Zustand state:
       localStorage.setItem("accessToken", ...)
       localStorage.setItem("refreshToken", ...)
       set({ user, isAuthenticated: true })

6. React re-renders
   → AppLayout sees isAuthenticated = true
   → navigate('/dashboard')
```

### Subsequent Request (Step by Step)

```
1. User opens a document
   → EditorPage useEffect: fetchDocument(id)
   → documentService.getById(id)
   → Axios GET /api/documents/:id

2. Request interceptor runs:
   → localStorage.getItem("accessToken") → found
   → adds: Authorization: Bearer eyJhbG...

3. Express authenticate middleware:
   → verifyAccessToken(token) → { userId, email }
   → req.user = { userId, email }

4. documentService.getById():
   → checks: is ownerId === req.user.userId? OR is user a collaborator?
   → returns document data

5. Component receives data, renders editor
```

### Token Refresh (Step by Step)

```
1. User left tab open for 20 minutes (accessToken expired after 15 min)
2. User clicks save
   → Axios PATCH /api/documents/:id
   → Server returns 401 "Token expired"

3. Response interceptor catches 401:
   → isRefreshing = false initially → starts refresh
   → Axios POST /api/auth/refresh { refreshToken }
   → Server verifies refreshToken in DB, issues new accessToken
   → Response: { accessToken: "eyJhbG... (new)" }

4. Interceptor:
   → localStorage.setItem("accessToken", newToken)
   → retries original PATCH /api/documents/:id with new token
   → succeeds silently

5. User sees document saved. Never knew the token expired.
```

---

## 14. Document Lifecycle — Create to Share

### Creating a Document

```
User clicks "New Document" → Modal opens → types title → clicks Create

DashboardPage:
  createDocument(title):
    documentService.create({ title, content: "", folderId })
      → POST /api/documents
      → documentController.create()
      → documentService.create():
          prisma.document.create({ data: { title, content: "", ownerId } })
      → returns { id, title, content, createdAt }

    set({ documents: [newDoc, ...state.documents] }) ← prepend to list
    navigate(`/editor/${doc.id}`)
```

### Editing and Auto-Saving

```
User types in editor
    ↓
MDEditor onChange → handleContentChange(value)
    ↓
updateCurrentDoc({ content: value })  ← instant local update (optimistic UI)
    ↓
clearTimeout + setTimeout(2000ms)     ← reset debounce timer
    ↓
[2 seconds of no typing]
    ↓
saveDocument(id, value)
    ↓
documentService.update(id, { content: value })
    ↓
PATCH /api/documents/:id
    ↓
documentService.update() in Express:
  if content changed:
    prisma.$transaction([
      prisma.documentVersion.create({ content: OLD content, label: "Auto-save" }),
      prisma.document.update({ content: NEW content })
    ])
  else:
    prisma.document.update({ ...other fields })
    ↓
Response: updated document
    ↓
setLastSaved(new Date()) → toolbar shows "Saved just now"
```

### Sharing a Document

```
User clicks Share button → Share Modal opens
  → Toggle "Public" switch
  → documentService.share(id, true)
  → POST /api/documents/:id/share { isPublic: true }
  → documentService.share():
      shareToken = uuidv4()   ← random unique string
      prisma.document.update({ isPublic: true, shareToken })
  → Response: { id, isPublic: true, shareToken: "abc-123-def" }

  → shareLink = `http://localhost:5173/shared/abc-123-def`
  → displayed in modal with Copy button

Anyone with that link:
  → GET /api/documents/shared/abc-123-def (no auth)
  → documentService.getByShareToken("abc-123-def")
  → prisma.document.findUnique({ where: { shareToken: "abc-123-def" } })
  → returns document
  → SharedDocumentPage renders read-only markdown
```

---

## 15. Error Handling Strategy

### Backend Errors Flow

```
Layer 1 — Validation (Zod):
  Bad request body → 400 with field-level errors
  Stops here. Service never called.

Layer 2 — Business Logic (AppError):
  throw new AppError("Document not found.", 404)
  throw new AppError("Access denied.", 403)
  throw new AppError("Email already in use.", 409)
  These bubble up to errorHandler automatically via asyncHandler.

Layer 3 — Prisma errors (in errorHandler):
  P2002 → "A record with this value already exists." (409)
  P2025 → "Record not found." (404)

Layer 4 — JWT errors (in errorHandler):
  JsonWebTokenError → "Invalid token." (401)
  TokenExpiredError → "Token expired." (401)

Layer 5 — Unknown errors (in errorHandler):
  Logged to console
  Returns: "Internal server error." (500)
  Stack trace shown only in development
```

### Frontend Error Handling

```
API errors:
  Axios response interceptor → catches 401 → attempts token refresh
  If refresh fails → clears auth → redirects to /login

Component-level:
  try { await authStore.login() } catch (err) {
    const msg = err.response?.data?.message ?? "Login failed."
    toast.error(msg)    ← shows notification
  }

react-hot-toast positions:
  top-right corner
  auto-dismisses after 3 seconds
  Error → red | Success → green
```

---

## 16. Why Each Technology Was Chosen

| Technology | Alternative | Why This One |
|---|---|---|
| **TypeScript** | Plain JavaScript | Catches bugs before runtime. IDE autocomplete. Self-documenting code. |
| **Express.js** | Fastify, NestJS, Hapi | Most widely used. Huge ecosystem. Simple to learn. Perfect for understanding middleware. |
| **Prisma** | Sequelize, TypeORM, Knex | Best TypeScript integration. Auto-generates types. Readable query syntax. Easy migrations. |
| **PostgreSQL** | MySQL, MongoDB | Supports arrays (tags), JSONB, full-text search, and strict relational data in one DB. |
| **Zod** | Joi, Yup, class-validator | Works perfectly with TypeScript. Derives types from schema. No duplication. |
| **JWT** | Sessions, OAuth | Stateless (no server memory needed). Portable (works across multiple servers). Teaches auth fundamentals. |
| **bcrypt** | argon2, scrypt | Industry standard. Built-in salting. Well-tested. |
| **Vite** | Create React App, Webpack | Much faster dev server. Instant HMR. Modern ESM-based. |
| **React** | Vue, Svelte, Angular | Most popular frontend library. Huge ecosystem. Most job postings. |
| **Zustand** | Redux, Context API | Simpler API than Redux. No boilerplate. No providers needed. Fast. |
| **Tailwind CSS** | CSS Modules, styled-components | No context switching. Consistent design system. Tiny production bundle. |
| **React Router v6** | TanStack Router, Next.js | Standard choice for SPAs. Nested routes with Outlet pattern. |
| **react-hot-toast** | react-toastify, Chakra toast | Minimal bundle size. Clean default style. Dead simple API. |
| **Cloudinary** | AWS S3, local disk | Free tier. Handles image optimization automatically. No server storage needed. |
| **date-fns** | moment.js, dayjs | Tree-shakeable (only import what you use). Immutable. Modern. |
| **Docker Compose** | Local Postgres install | One command to start DB. Same config for every team member. Easy teardown. |

---

## Quick Reference Card

### Backend — One Line Per Concept

```
server.ts      → boots the app (entry point)
app.ts         → connects all middleware and routes
env.ts         → reads .env, throws if required vars missing
database.ts    → single Prisma instance (singleton)
authenticate   → middleware: verifies JWT, sets req.user
validate       → middleware: runs Zod schema, returns 400 if fails
errorHandler   → last middleware: handles all thrown errors
asyncHandler   → wrapper: forwards async errors to errorHandler
AppError       → custom Error: carries a statusCode for HTTP response
sendSuccess    → helper: consistent { success, message, data } response
getPagination  → helper: converts page/limit to skip/take for Prisma
signAccessToken → creates 15-min JWT
verifyAccessToken → verifies 15-min JWT, returns payload
```

### Frontend — One Line Per Concept

```
main.tsx       → mounts React app into HTML
App.tsx        → defines URL → Component mapping
AppLayout.tsx  → auth guard + app shell (navbar + sidebar + outlet)
authStore      → global auth state: user, tokens, login(), logout()
documentStore  → global doc state: documents, currentDoc, fetch/save/delete
api.ts         → Axios + auto-auth-header + auto-token-refresh
LoginPage      → controlled form → authStore.login → navigate
DashboardPage  → document grid + search + create + delete
EditorPage     → MDEditor + debounce auto-save + share + version history
SharedDocPage  → public read-only view by share token
Button         → reusable button with variant/size/loading props
Input          → labeled input with error message
Modal          → portal-based dialog with Escape key support
DocumentCard   → single card in grid with title/tags/meta/delete
Sidebar        → folder navigation + tag filter pills
Navbar         → logo + logout button
```

---

*This is a living document — update it as you add features in Phase 3.*
