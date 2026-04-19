# Folio — Codebase Explained Simply
### For Beginners: Node.js + React + How It All Works Together

---

## The Big Picture (Before Any Code)

Think of this project like a **restaurant**.

```
Customer (Browser/React)
    │
    │  "I want to login"  →  sends order to kitchen
    │
Kitchen Staff (Node.js/Express)
    │
    ├─ Waiter (Routes)         → receives the order
    ├─ Chef (Service)          → actually makes the food (business logic)
    ├─ Pantry (Database)       → where all the ingredients/data live
    └─ Quality Check (Middleware) → checks every order before it reaches the chef
```

- **React** = the customer facing side (what users see and click)
- **Node.js/Express** = the kitchen (processes requests, talks to database)
- **PostgreSQL** = the pantry/storage (all data lives here)
- **Prisma** = the recipe book (how to talk to the database)

---

## Part 1: What is Node.js? (Plain English)

### The Old Problem
Browsers run JavaScript. But JavaScript only ran in browsers — you couldn't use it to build servers. If you wanted a server, you had to use PHP, Java, Python, etc.

### What Node.js Did
Node.js took the JavaScript engine from Google Chrome and put it on your computer. Now JavaScript can run **outside the browser** — on servers, in terminals, anywhere.

```
Before Node.js:
  Frontend → JavaScript
  Backend  → PHP / Java / Python  (different language!)

After Node.js:
  Frontend → JavaScript
  Backend  → JavaScript  ✅ (same language everywhere)
```

### The Superpower: Non-Blocking
Normal servers wait. Node.js doesn't.

```
Normal server (blocking):
  Request 1: "Get user from DB"  → WAIT 100ms → done → next request
  Request 2:                          WAITING...

Node.js (non-blocking):
  Request 1: "Get user from DB"  → starts, doesn't wait
  Request 2: "Get documents"     → starts immediately
  Request 1:                     → finishes, sends response
  Request 2:                     → finishes, sends response

Both handled almost at the same time. This is why Node.js handles thousands
of requests per second without expensive hardware.
```

**In our project**: Every `async/await` you see is Node.js being non-blocking.

```typescript
// server/src/modules/auth/auth.service.ts

// These two run one after the other — NOT blocking other requests
const user = await prisma.user.findUnique(...)  // asks DB, doesn't block
const isValid = await bcrypt.compare(...)        // checks password, doesn't block
```

---

## Part 2: What is Express.js? (Plain English)

Node.js gives you the engine. Express gives you the **steering wheel**.

Without Express, handling an HTTP request looks like this:
```javascript
// Raw Node.js — painful
const http = require('http')
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/login') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      const data = JSON.parse(body)
      // now handle login...
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    })
  }
})
```

With Express, the same thing becomes:
```javascript
// Express — clean
app.post('/login', (req, res) => {
  const data = req.body  // already parsed!
  res.json({ success: true })  // easy!
})
```

Express handles all the boring parts. You just write the logic.

### Middleware — The Assembly Line

Middleware is the most important concept in Express. Every request passes through a chain of functions before reaching your route handler.

```
Request arrives
      ↓
  [ helmet ]       → adds security headers
      ↓
  [ cors ]         → checks if this website is allowed to talk to us
      ↓
  [ morgan ]       → logs "POST /api/auth/login 200 45ms" to terminal
      ↓
  [ express.json ]  → reads the request body and makes it available as req.body
      ↓
  [ rateLimiter ]  → checks "has this IP sent too many requests?"
      ↓
  [ validate ]     → checks "is the request body the right shape?"
      ↓
  [ authenticate ] → checks "is there a valid login token?"
      ↓
  [ your handler ] → your actual code runs here
      ↓
  Response sent back to browser
```

**In our project**: [server/src/app.ts](server/src/app.ts) is where all middleware is set up.

```typescript
// server/src/app.ts — the assembly line
app.use(helmet())           // security
app.use(cors(...))          // allow React to talk to us
app.use(morgan("dev"))      // logging
app.use(express.json())     // parse request body
app.use("/api", apiLimiter) // rate limiting
app.use("/api/auth", authRoutes)      // hand off to auth routes
app.use("/api/documents", docRoutes)  // hand off to document routes
app.use(errorHandler)       // catch ALL errors at the end
```

---

## Part 3: The Full Request Lifecycle

### Example: User logs in

Let's trace every single step when a user types their email/password and clicks "Login".

---

#### Step 1 — React (Browser Side)
```
User fills in email + password → clicks Login button
```

```typescript
// client/src/pages/auth/LoginPage.tsx
const handleSubmit = async (e) => {
  e.preventDefault()
  await login(form.email, form.password)  // calls the Zustand store
  navigate('/dashboard')
}
```

---

#### Step 2 — Zustand Store calls the API Service
```typescript
// client/src/store/authStore.ts
login: async (email, password) => {
  const result = await authService.login(email, password)
  // saves tokens to localStorage
  localStorage.setItem('accessToken', result.accessToken)
  // updates global state — every component that reads `user` re-renders
  set({ user: result.user, isAuthenticated: true })
}
```

---

#### Step 3 — Axios sends the HTTP request
```typescript
// client/src/services/auth.service.ts
async login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data.data
}
```

This sends:
```
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{ "email": "john@example.com", "password": "MyPassword1" }
```

---

#### Step 4 — Express receives the request
The request hits Node.js/Express. It passes through the middleware chain:

```
→ helmet adds security headers
→ cors checks: "is this from localhost:5173?" → YES, allow
→ morgan logs: POST /api/auth/login
→ express.json() reads the body → req.body = { email, password }
→ apiLimiter: "this IP has sent 3 requests in the last minute" → OK
→ authLimiter: "this IP has sent 2 login attempts" → OK
→ validate(loginSchema): "is email valid? is password present?" → YES
→ reaches authController.login()
```

---

#### Step 5 — Controller (thin layer, just HTTP)
```typescript
// server/src/modules/auth/auth.controller.ts
login: asyncHandler(async (req, res) => {
  const { email, password } = req.body   // already validated by Zod
  const result = await authService.login(email, password)  // hand off to service
  sendSuccess(res, result, "Login successful.")  // send response
})
```

The controller only does 3 things: read request → call service → send response.

---

#### Step 6 — Service (the actual business logic)
```typescript
// server/src/modules/auth/auth.service.ts
async login(input) {
  // 1. Find user in database
  const user = await prisma.user.findUnique({ where: { email: input.email } })

  // 2. Compare password (even if user doesn't exist, to prevent timing attacks)
  const isValid = await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash)

  // 3. If wrong credentials, throw error
  if (!user || !isValid) throw new AppError("Invalid email or password.", 401)

  // 4. Generate two tokens
  const accessToken  = signAccessToken({ userId: user.id, email: user.email })
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email })

  // 5. Save refresh token in database
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } })

  // 6. Return tokens + user data
  return { user, accessToken, refreshToken }
}
```

---

#### Step 7 — Prisma talks to PostgreSQL
When Prisma runs `findUnique`, it generates and runs real SQL:
```sql
SELECT id, email, password_hash, name FROM users WHERE email = 'john@example.com' LIMIT 1
```
PostgreSQL returns the result. Prisma converts it into a TypeScript object.

---

#### Step 8 — Response travels back
```
Service → Controller → Express → HTTP response → Axios → Zustand store → React re-renders
```

The JSON response:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "id": "clx...", "name": "John", "email": "john@example.com" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

#### Step 9 — React updates the UI
```typescript
// authStore receives the response, saves to state + localStorage
set({ user: result.user, isAuthenticated: true })

// AppLayout sees isAuthenticated = true → shows the dashboard
// LoginPage.tsx runs: navigate('/dashboard')
// User sees the dashboard
```

**Total time: ~100-200ms.** That's the full lifecycle of one request.

---

## Part 4: What is React? (Plain English)

### The Old Way (without React)
```html
<!-- Old way: manually update the DOM -->
<span id="count">0</span>
<button onclick="
  let el = document.getElementById('count')
  el.textContent = parseInt(el.textContent) + 1
">Click me</button>
```

This gets extremely messy with real apps (hundreds of elements, shared data, etc.)

### What React Does
React lets you **describe what the UI should look like** based on data (state).
When data changes, React figures out what changed and updates only that part.

```tsx
// React way — describe the UI, React handles updates
const [count, setCount] = useState(0)

return (
  <div>
    <span>{count}</span>
    <button onClick={() => setCount(count + 1)}>Click me</button>
  </div>
)
// When count changes, React automatically updates the <span>
// You never touch the DOM directly
```

### The 3 Core Concepts in Our Project

#### 1. Components — Reusable Pieces of UI
```tsx
// A component = a function that returns HTML-like JSX
// client/src/components/ui/Button.tsx

const Button = ({ children, onClick, isLoading }) => {
  return (
    <button onClick={onClick} disabled={isLoading}>
      {isLoading ? <Spinner /> : children}
    </button>
  )
}

// Use it anywhere:
<Button onClick={handleSave} isLoading={saving}>Save Document</Button>
<Button onClick={handleDelete} variant="danger">Delete</Button>
```

Think of components like **LEGO bricks** — you build small ones, then combine them into bigger ones.

```
App
├── Navbar          (small brick)
├── Sidebar         (small brick)
│   ├── FolderList  (smaller brick inside)
│   └── TagList     (smaller brick inside)
└── Dashboard
    ├── SearchBar   (small brick)
    └── DocumentCard × 20  (same brick repeated)
```

#### 2. State — Data That Changes
```tsx
// useState: local state (only this component cares)
const [searchText, setSearchText] = useState("")
const [isModalOpen, setIsModalOpen] = useState(false)

// Zustand: global state (many components care)
const { user, isAuthenticated } = useAuthStore()
// user is available in Navbar, Sidebar, Dashboard, Editor — everywhere
```

**Rule of thumb**:
- Does only this component care? → `useState`
- Do multiple components care? → `Zustand store`

#### 3. useEffect — Running Code at the Right Time
```tsx
// "After this component appears on screen, fetch documents"
useEffect(() => {
  fetchDocuments()
}, [])  // [] = run once on mount

// "Every time the document ID in the URL changes, load that document"
useEffect(() => {
  if (id) fetchDocument(id)
}, [id])  // [id] = run whenever `id` changes

// "Auto-save 2 seconds after user stops typing"
useEffect(() => {
  const timer = setTimeout(() => saveDocument(), 2000)
  return () => clearTimeout(timer)  // cleanup: cancel timer if user types again
}, [content])
```

**Where to see this**: [client/src/pages/EditorPage.tsx](client/src/pages/EditorPage.tsx)

---

## Part 5: How React and Node.js Talk to Each Other

They are completely separate programs. React runs in your browser. Node.js runs on a server. They talk via **HTTP requests** (the same protocol your browser uses to load websites).

```
React (port 5173)                Node.js (port 4000)
      │                                  │
      │   POST /api/auth/login           │
      │  ──────────────────────────────► │
      │                                  │  (checks DB, generates tokens)
      │   { success: true, data: {...} } │
      │  ◄────────────────────────────── │
      │                                  │
```

**In development**: Vite (React's dev server) has a proxy set up:
```typescript
// client/vite.config.ts
proxy: {
  "/api": { target: "http://localhost:4000" }
}
```
Any React request to `/api/...` gets forwarded to Express on port 4000.

**In production**: Both run behind a single domain. Nginx routes `/api/*` to Node.js, everything else to React's built HTML files.

---

## Part 6: The File Structure — What Lives Where and Why

```
editor/
│
├── server/                         ← Everything Node.js
│   ├── prisma/
│   │   └── schema.prisma           ← Your database blueprint
│   │
│   └── src/
│       ├── server.ts               ← START HERE: boots up the server
│       ├── app.ts                  ← sets up Express + all middleware
│       │
│       ├── config/
│       │   ├── env.ts              ← reads .env variables (PORT, DB_URL, etc.)
│       │   └── database.ts         ← creates one Prisma connection (singleton)
│       │
│       ├── middlewares/
│       │   ├── authenticate.ts     ← checks JWT token on protected routes
│       │   ├── validate.ts         ← checks request body shape with Zod
│       │   ├── rateLimiter.ts      ← limits requests per IP
│       │   └── errorHandler.ts     ← catches ALL errors, sends clean response
│       │
│       ├── utils/
│       │   ├── AppError.ts         ← custom error class (throw new AppError('msg', 404))
│       │   ├── asyncHandler.ts     ← wraps async controllers so errors auto-forward
│       │   ├── token.ts            ← sign/verify JWT tokens
│       │   ├── response.ts         ← sendSuccess(), sendError() helpers
│       │   └── pagination.ts       ← calculates skip/take from page/limit
│       │
│       └── modules/                ← each feature = its own folder
│           ├── auth/
│           │   ├── auth.schema.ts  ← Zod: what shape is valid login/register data?
│           │   ├── auth.service.ts ← business logic: hash password, generate tokens
│           │   ├── auth.controller.ts ← HTTP: read req, call service, send res
│           │   └── auth.routes.ts  ← URL mapping: POST /login → controller.login
│           │
│           ├── documents/          ← same 4-file pattern
│           ├── folders/
│           ├── versions/
│           └── uploads/
│
└── client/                         ← Everything React
    └── src/
        ├── main.tsx                ← START HERE: mounts React into index.html
        ├── App.tsx                 ← defines all URL routes (React Router)
        ├── index.css               ← global styles + Tailwind
        │
        ├── types/
        │   └── index.ts            ← TypeScript interfaces (User, Document, etc.)
        │
        ├── services/               ← functions that call the API
        │   ├── api.ts              ← Axios instance + token refresh interceptor
        │   ├── auth.service.ts     ← login(), register(), logout()
        │   ├── document.service.ts ← list(), getById(), create(), update(), delete()
        │   └── folder.service.ts   ← list(), create(), update(), delete()
        │
        ├── store/                  ← global state (Zustand)
        │   ├── authStore.ts        ← user, isAuthenticated, login(), logout()
        │   └── documentStore.ts    ← documents[], currentDoc, fetchDocuments()
        │
        ├── components/             ← reusable UI pieces
        │   ├── ui/
        │   │   ├── Button.tsx      ← reusable button with variants/loading state
        │   │   ├── Input.tsx       ← input with label + error message
        │   │   └── Modal.tsx       ← dialog overlay (uses React Portal)
        │   ├── layout/
        │   │   ├── Navbar.tsx      ← top bar with logo + logout
        │   │   ├── Sidebar.tsx     ← folders + tags navigation
        │   │   └── AppLayout.tsx   ← wraps protected pages (redirects if not logged in)
        │   └── documents/
        │       └── DocumentCard.tsx ← one card in the document grid
        │
        └── pages/                  ← full page components (one per route)
            ├── auth/
            │   ├── LoginPage.tsx
            │   └── RegisterPage.tsx
            ├── DashboardPage.tsx   ← document list + search
            ├── EditorPage.tsx      ← markdown editor + auto-save + version history
            └── SharedDocumentPage.tsx ← public read-only view
```

---

## Part 7: The Authentication System Explained Simply

### Why We Need Two Tokens

Imagine a hotel key card system:

```
Access Token  = Day pass (expires in 15 minutes)
Refresh Token = Master key (lasts 7 days, stored safely)

When your day pass expires:
  → You don't go back to reception (login again)
  → You use the master key to get a new day pass automatically
  → Happens silently, user never notices
```

### What's Stored Where

```
Browser localStorage:
  accessToken  → sent with EVERY request ("day pass")
  refreshToken → only used to get a new accessToken ("master key")

PostgreSQL Database:
  refresh_tokens table → the server's record of all valid master keys
  When you logout → your master key is deleted from DB → can never refresh again
```

### Why Not Just One Long-Lived Token?

If someone steals your token:
```
Long-lived token stolen → attacker has access for 7 days  😱
Short-lived token stolen → attacker has access for 15 minutes  ✅
```

---

## Part 8: The Database — How Prisma Works

### Prisma Schema → Real Tables

You write this:
```prisma
// prisma/schema.prisma
model Document {
  id      String @id @default(cuid())
  title   String
  content String
  ownerId String
  owner   User   @relation(fields: [ownerId], references: [id])
}
```

Prisma creates this in PostgreSQL:
```sql
CREATE TABLE documents (
  id       VARCHAR PRIMARY KEY,
  title    VARCHAR NOT NULL,
  content  TEXT NOT NULL,
  owner_id VARCHAR REFERENCES users(id)
);
```

And gives you TypeScript types automatically — you never write SQL.

### Prisma Queries = Plain English

```typescript
// "Find one document where id equals this value"
prisma.document.findUnique({ where: { id: "clx123" } })

// "Find all documents owned by this user, 20 per page, newest first"
prisma.document.findMany({
  where: { ownerId: userId },
  take: 20,
  skip: 0,
  orderBy: { updatedAt: "desc" }
})

// "Create a new document"
prisma.document.create({
  data: { title: "My Doc", content: "", ownerId: userId }
})

// "Update a document's title"
prisma.document.update({
  where: { id: "clx123" },
  data: { title: "New Title" }
})
```

---

## Part 9: Zod — The Bodyguard

Zod validates data at the door before anything else happens.

```typescript
// Define the rule
const loginSchema = z.object({
  email: z.string().email(),       // must be a valid email
  password: z.string().min(8)      // must be at least 8 characters
})

// What happens if someone sends bad data:
{ email: "notanemail", password: "123" }

// Zod catches it → returns 400:
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "email",    "message": "Invalid email address" },
    { "field": "password", "message": "Must be at least 8 characters" }
  ]
}
// Your service code NEVER runs. Garbage in, garbage stopped at the door.
```

---

## Part 10: The 4-Layer Pattern (Most Important Thing to Learn)

Every module in this project follows the same pattern. Learn it once, understand everything.

```
Route  →  Controller  →  Service  →  Database
```

| Layer | File | Job | Knows about |
|---|---|---|---|
| Route | `auth.routes.ts` | "Which URL goes where?" | HTTP methods, URL paths, middleware |
| Controller | `auth.controller.ts` | "Read request, call service, send response" | `req`, `res`, service |
| Service | `auth.service.ts` | "The actual business logic" | Prisma, bcrypt, tokens |
| Database | Prisma + PostgreSQL | "Store and retrieve data" | Tables, SQL |

**Why this separation?**

```
Imagine you want to change: "users must have a profile picture to login"

Without separation (everything in one file):
  → Find login code buried somewhere → edit carefully → hope you don't break anything

With separation:
  → Open auth.service.ts → find login() → add one check → done
  → Routes and controller don't change at all
```

Each layer has ONE job. Changing one layer doesn't affect the others.

---

## Summary — Mental Model

```
User opens browser
    │
    ▼
React (client/) renders the UI
    │ user does something (click, type)
    ▼
Zustand store (store/) manages state
    │ calls API service
    ▼
Axios (services/api.ts) sends HTTP request
    │
    ▼
═══════════════════════════════════════
Express (server/) receives request
    │
    ├─ Middleware chain (security, logging, validation, auth)
    │
    ├─ Route → Controller → Service
    │
    ├─ Prisma → PostgreSQL (fetch/save data)
    │
    └─ Response sent back
═══════════════════════════════════════
    │
    ▼
Axios receives response
    │
    ▼
Zustand updates state
    │
    ▼
React re-renders only the changed parts
    │
    ▼
User sees updated UI
```

That loop is your entire application.
Every feature you build — create document, share link, restore version — is just that loop again with different data.

---

*Once you understand this flow completely, you understand 80% of how professional Node.js + React apps work.*
