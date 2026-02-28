# TubeToMD — Backend Service

> Express 5 + TypeScript REST API for TubeToMD

## Overview

The backend handles authentication, session management, AI note generation via Google Gemini, RAG-based chat, PDF report generation, transcript translation, and Gemini API key rotation.

## Tech Stack

- **Express 5** + **TypeScript** — REST API framework
- **Mongoose 8** — MongoDB ODM
- **@google/generative-ai** — Gemini 2.0 Flash + text-embedding-004
- **pdfkit** — PDF report generation
- **jsonwebtoken** + **bcryptjs** — JWT auth with bcrypt password hashing
- **multer** — Audio chunk file uploads
- **luxon** + **uuid** — Date formatting and unique IDs

## Setup

```bash
cp .env.example .env    # Fill in your variables
npm install
npm run dev             # Starts on http://localhost:5000
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |

## Environment Variables

See [.env.example](.env.example) for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `GEMINI_API_KEY` | Primary Gemini API key |
| `GEMINI_API_KEYS` | Comma-separated additional keys for rotation |
| `ADMIN_API_TOKEN` | Bearer token for admin endpoints |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `PYTHON_SERVICE_URL` | Python transcription service URL |

## API Routes

All routes prefixed with `/api/v1/`:

- `/auth` — Register, login, Google OAuth, token refresh
- `/sessions` — CRUD, YouTube/upload flow, transcript, translate, PDF report
- `/notes` — Generate AI notes, CRUD, export
- `/chat` — RAG Q&A, history
- `/annotations` — Timestamp annotations CRUD
- `/admin` — Gemini key pool management (requires `ADMIN_API_TOKEN`)

## Architecture

```
src/
├── config/          # Server, DB, CORS, Gemini configs
├── controllers/     # Request handlers
├── middlewares/      # Auth (JWT), Upload (Multer)
├── models/          # Mongoose schemas
├── repositories/    # Data access layer
├── routes/v1/       # REST routes + Admin routes
├── services/        # Business logic
│   ├── gemini.service.ts           # AI calls with auto key rotation
│   ├── geminiKeyManager.service.ts # Circular key queue singleton
│   ├── report.service.ts           # PDF report generation
│   └── ...
├── types/           # TypeScript interfaces
└── utils/           # Error handling, logging
```

## Gemini Key Rotation

The `GeminiKeyManager` manages a pool of API keys:
- Round-robin key selection for each API call
- Auto-marks exhausted keys on 429 errors with parsed refill timers
- Background reactivation every 10 seconds
- Runtime key management via admin endpoints

## PDF Reports

`GET /api/v1/sessions/:id/report` generates a comprehensive PDF containing:
- Title page with session metadata
- Table of contents
- Summary, detailed notes, visual diagrams, flashcards, study guide
- User annotations with timestamps
- Full transcript with timestamps
- Page numbers
