# InkBase

Collaborative markdown editor — full-stack portfolio project.

## Stack
- **Backend**: Node.js 20 · Express · TypeScript · Prisma · PostgreSQL
- **Frontend**: React 18 · Vite · TypeScript · Tailwind CSS · Zustand
- **Auth**: JWT (dual-token: access + refresh)
- **Files**: Cloudinary

## Quick Start

### 1. Start Postgres
```bash
docker-compose up -d
```

### 2. Server
```bash
cd server
npm install
cp .env.example .env     # fill in JWT secrets and Cloudinary keys
npm run db:migrate
npm run dev              # http://localhost:4000
```

### 3. Client
```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

## API
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get tokens
- `GET  /api/documents` — list your documents (search, filter, paginate)
- `POST /api/documents` — create document
- `PATCH /api/documents/:id` — update (auto-saves a version on content change)
- `POST /api/documents/:id/share` — toggle public link
- `GET  /api/documents/shared/:token` — public read (no auth)
- `GET  /api/versions/:documentId` — version history
- `POST /api/versions/:versionId/restore` — restore version
- `GET  /api/folders` — list folders
- `POST /api/uploads/:documentId` — upload attachment

## Project Structure
```
editor/
├── server/          # Express + TypeScript API
│   ├── prisma/      # DB schema + migrations
│   └── src/
│       ├── config/  # env, db, cloudinary
│       ├── middlewares/
│       ├── modules/ # auth, users, documents, folders, versions, uploads
│       └── utils/
├── client/          # React + Vite
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/ # API calls
│       └── store/    # Zustand state
└── docker-compose.yml
```

## Learning Guide
See [LEARN.md](LEARN.md) for a full explanation of every concept, pattern, and decision in this project.
