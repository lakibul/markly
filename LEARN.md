# InkBase — Learning Guide
### Node.js · Express · TypeScript · React · PostgreSQL + Prisma

This guide maps every concept in this project to a learning level, explains the WHY, and tells you what to read next.

---

## Project Lifecycle (How a Request Travels Through the Stack)

```
Browser (React)
  │
  ├─ User clicks "Login"
  │    └─ loginPage calls authService.login()
  │         └─ Axios POST /api/auth/login (with JSON body)
  │
Server (Express)
  │
  ├─ morgan logs the request
  ├─ helmet checks headers
  ├─ cors allows the origin
  ├─ express.json() parses the body
  ├─ apiLimiter checks request count
  ├─ authLimiter (strict) checks for this route
  ├─ validate(loginSchema) checks body shape with Zod
  │    └─ if invalid → 400 response, stop here
  ├─ authController.login() called
  │    └─ authService.login() runs business logic
  │         ├─ prisma.user.findUnique() → SQL SELECT
  │         ├─ bcrypt.compare() → verify password
  │         ├─ signAccessToken() + signRefreshToken()
  │         └─ prisma.refreshToken.create() → SQL INSERT
  └─ sendSuccess(res, data) → JSON response

Browser receives response
  └─ authStore saves tokens to localStorage
       └─ React re-renders, redirects to /dashboard
```

This flow repeats for every API call. Understanding this pipeline = understanding Express.

---

## Node.js Learning Path in This Project

### Level 1 — Fundamentals

#### Modules & Imports
```typescript
// CommonJS (old way)
const express = require('express')

// ESModules (new way) — what we use with TypeScript
import express from 'express'
```
**Where to see this**: Every file in `server/src/`

#### Async/Await
```typescript
// Without async/await (callback hell)
db.query('SELECT...', (err, result) => {
  db.insert(..., (err2, result2) => { ... })
})

// With async/await (readable, linear)
const user = await prisma.user.findUnique({ where: { id } })
const doc = await prisma.document.create({ data: ... })
```
**Where to see this**: Every service file

#### Environment Variables
```typescript
// Bad: hardcoded
const secret = "mypassword123"

// Good: from environment
const secret = process.env.JWT_SECRET
```
**Where to see this**: [server/src/config/env.ts](server/src/config/env.ts)

---

### Level 2 — Express Core

#### What is Middleware?
Middleware is a function that runs between the request arriving and your route handler.
```
Request → [middleware 1] → [middleware 2] → [route handler] → Response
```
Each middleware can:
- Modify `req` or `res`
- End the request (send a response)
- Call `next()` to pass to the next middleware

```typescript
// This is a middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization
  if (!token) return res.status(401).json({ error: 'No token' })
  req.user = verifyToken(token)  // attach data to req
  next()  // continue to route handler
}
```
**Where to see this**: [server/src/middlewares/](server/src/middlewares/)

#### Error Handling
Express has a special 4-parameter middleware for errors:
```typescript
// All errors end up here if you call next(error)
app.use((err, req, res, next) => {
  res.status(err.statusCode).json({ message: err.message })
})
```
**Where to see this**: [server/src/middlewares/errorHandler.ts](server/src/middlewares/errorHandler.ts)

#### Router Modularization
```typescript
// Instead of one huge file with all routes:
app.post('/api/auth/login', ...)
app.post('/api/auth/register', ...)
app.get('/api/documents', ...)

// We split into modules:
app.use('/api/auth', authRouter)     // auth.routes.ts handles /login, /register
app.use('/api/documents', docsRouter) // document.routes.ts handles CRUD
```
**Where to see this**: [server/src/app.ts](server/src/app.ts)

---

### Level 3 — Database with Prisma

#### What is an ORM?
ORM (Object Relational Mapper) translates between JavaScript objects and SQL queries.

```typescript
// Without ORM (raw SQL — error-prone, no types)
db.query("SELECT * FROM users WHERE id = $1", [userId])

// With Prisma (type-safe, readable)
const user = await prisma.user.findUnique({ where: { id: userId } })
// TypeScript knows the exact shape of `user` from your schema
```

#### Key Prisma Patterns Used in This Project

**Find with conditions:**
```typescript
prisma.document.findMany({
  where: { ownerId: userId, tags: { has: "react" } },
  orderBy: { updatedAt: "desc" },
  skip: 0, take: 20,         // pagination
  select: { id: true, title: true }  // only fetch needed columns
})
```

**Relations (JOIN equivalent):**
```typescript
prisma.document.findUnique({
  where: { id },
  include: {
    folder: true,          // JOIN folders
    collaborators: {       // JOIN collaborators
      include: { user: true }  // then JOIN users
    }
  }
})
```

**Transactions (atomic operations):**
```typescript
// Either BOTH succeed, or BOTH fail. No partial updates.
await prisma.$transaction([
  prisma.documentVersion.create({ data: snapshot }),
  prisma.document.update({ where: { id }, data: newContent }),
])
```
**Where to see this**: [server/src/modules/documents/document.service.ts](server/src/modules/documents/document.service.ts)

---

### Level 4 — Authentication (JWT Dual-Token)

#### Why Two Tokens?
| Token | Lifetime | Stored | Used for |
|---|---|---|---|
| Access Token | 15 min | Memory (React state) | Every API request |
| Refresh Token | 7 days | DB + localStorage | Getting a new access token |

**Flow:**
```
Login → Server issues: accessToken (15min) + refreshToken (7d)
  ↓
Client uses accessToken for all requests
  ↓
AccessToken expires → Client calls /auth/refresh with refreshToken
  ↓
Server verifies refreshToken in DB → Issues new accessToken
  ↓
Logout → Server deletes refreshToken from DB → can't refresh anymore
```

**Why not just use long-lived access tokens?**
If your 7-day token is stolen, the attacker has 7 days of access. With 15-min access tokens, even if stolen, it expires fast. The refresh token never travels with every request.

**Where to see this**:
- [server/src/utils/token.ts](server/src/utils/token.ts) — signing/verifying
- [server/src/modules/auth/auth.service.ts](server/src/modules/auth/auth.service.ts) — the full flow
- [client/src/services/api.ts](client/src/services/api.ts) — automatic refresh interceptor

---

### Level 5 — Advanced Patterns

#### Modular Architecture (Feature Folders)
Each feature (auth, documents, folders) owns:
```
modules/documents/
  ├── document.schema.ts    ← Zod validation (what shape is valid input?)
  ├── document.service.ts   ← Business logic (HOW do we process it?)
  ├── document.controller.ts ← HTTP layer (read req, call service, send res)
  └── document.routes.ts    ← URL mapping (WHICH URL calls which controller?)
```
This is the industry standard. When a feature has a bug, you know exactly where to look.

#### The asyncHandler Pattern
```typescript
// Without asyncHandler — repeated boilerplate
router.get('/docs', async (req, res, next) => {
  try {
    const docs = await documentService.list()
    res.json(docs)
  } catch (err) {
    next(err)  // must manually catch and forward
  }
})

// With asyncHandler — clean controller
router.get('/docs', asyncHandler(async (req, res) => {
  const docs = await documentService.list()
  res.json(docs)  // errors automatically forwarded to errorHandler
}))
```
**Where to see this**: [server/src/utils/asyncHandler.ts](server/src/utils/asyncHandler.ts)

#### Zod Schema + TypeScript Types (No Duplication)
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Derive the TypeScript type FROM the Zod schema
type RegisterInput = z.infer<typeof registerSchema>
// RegisterInput is now: { email: string, password: string }
// You don't write the type separately — Zod generates it.
```

---

## React Learning Path in This Project

### Level 1 — Core React

#### Components and Props
```tsx
// A component is a function that returns JSX
const Button = ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => {
  return <button onClick={onClick}>{children}</button>
}

// Usage
<Button onClick={() => console.log('clicked')}>Save</Button>
```
**Where to see this**: [client/src/components/ui/Button.tsx](client/src/components/ui/Button.tsx)

#### useState
```tsx
const [value, setValue] = useState("")
// value = current state, setValue = function to update it
// Calling setValue() triggers a re-render
```
**Where to see this**: [client/src/pages/auth/LoginPage.tsx](client/src/pages/auth/LoginPage.tsx)

#### useEffect
```tsx
// Run ONCE on mount (empty dependency array)
useEffect(() => {
  fetchDocuments()
}, [])

// Run when `id` changes
useEffect(() => {
  fetchDocument(id)
}, [id])

// Cleanup (runs before next effect or unmount)
useEffect(() => {
  const timer = setTimeout(save, 2000)
  return () => clearTimeout(timer)  // cleanup prevents memory leaks
}, [content])
```
**Where to see this**: [client/src/pages/EditorPage.tsx](client/src/pages/EditorPage.tsx) — debounce auto-save

---

### Level 2 — State Management with Zustand

#### Why Not useState for Everything?
```
App
├── Navbar (needs user info)
├── Sidebar (needs folders)
└── Dashboard
    └── DocumentCard (needs delete function)

If state lives in App, you'd pass user → Navbar → ... (prop drilling)
Zustand: any component reads/writes state directly, no passing needed.
```

#### Zustand Pattern
```typescript
const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  login: async (email, password) => {
    const result = await authService.login(email, password)
    set({ user: result.user })  // update state
  },
}))

// In any component:
const { user, login } = useAuthStore()
```
**Where to see this**: [client/src/store/authStore.ts](client/src/store/authStore.ts)

---

### Level 3 — React Router v6

```tsx
// Define routes
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<AppLayout />}>          // parent layout
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/editor/:id" element={<EditorPage />} />
  </Route>
</Routes>

// Navigate programmatically
const navigate = useNavigate()
navigate('/dashboard')

// Read URL params
const { id } = useParams<{ id: string }>()

// Redirect
<Navigate to="/login" replace />
```
**Where to see this**: [client/src/App.tsx](client/src/App.tsx)

---

### Level 4 — Axios Interceptors (Advanced)

The refresh token interceptor in [client/src/services/api.ts](client/src/services/api.ts) is an advanced pattern.
Read it carefully — it handles:
1. Attaching auth header on every request (request interceptor)
2. Catching 401s and silently refreshing the token (response interceptor)
3. Queuing requests that arrive while a refresh is in-progress
4. Redirecting to login if refresh fails

---

## Project Lifecycle Summary

```
Development workflow:

1. docker-compose up -d           # start Postgres
2. cd server && npm install
3. cp .env.example .env           # fill in your secrets
4. npm run db:migrate              # create DB tables
5. npm run dev                     # start Express on :4000

6. cd client && npm install
7. npm run dev                     # start React on :5173

8. Visit http://localhost:5173
9. Register → Create docs → Share → Version history
```

---

## What to Learn Next (Phase 3 Preview)

| Concept | Technology | Difficulty |
|---|---|---|
| Real-time collaboration | Socket.io (WebSockets) | Advanced |
| Background jobs | BullMQ + Redis | Advanced |
| Caching | Redis (Upstash) | Intermediate |
| Full-text search | Postgres tsvector | Intermediate |
| AI writing assistant | Anthropic Claude API | Intermediate |
| Testing | Vitest + Supertest | Intermediate |
| Deployment | Railway + Docker | Intermediate |

---

## Common Mistakes to Avoid

1. **Storing plain-text passwords** — always hash with bcrypt
2. **Putting secrets in code** — always use `.env` files (never commit them)
3. **Missing `await`** — async functions without await silently fail
4. **No error handling** — always wrap async code with try/catch or asyncHandler
5. **Returning all DB data** — use `select:` to only return what the client needs
6. **No input validation** — always validate at the API boundary with Zod
7. **Single access token (no refresh)** — leads to either bad UX or bad security
8. **Creating new PrismaClient every request** — use the singleton pattern

---

*Keep this file open as you build. Every time you write a piece of code and don't understand why, find it in this guide.*
