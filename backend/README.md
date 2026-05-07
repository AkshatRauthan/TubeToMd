# TubeToMD — Backend Service

> Express 5 + TypeScript REST API for TubeToMD

## Overview

The backend handles authentication, session management, AI note generation via NVIDIA NIM (Llama 3.3 70B), RAG-based chat, PDF report generation, transcript translation, AI cover-image generation (FLUX.1-schnell), and NIM API key rotation with response caching.

## Tech Stack

- **Express 5** + **TypeScript** — REST API framework
- **Mongoose 8** — MongoDB ODM
- **openai** SDK — used in OpenAI-compatible mode against `https://integrate.api.nvidia.com/v1`
- **NVIDIA NIM** — Llama 3.3 70B + Llama 3.1 8B (LLM) · FLUX.1-schnell + SD3-medium (image)
- **pdfkit** — PDF report generation
- **jsonwebtoken** + **bcryptjs** — JWT auth with bcrypt password hashing
- **multer** — Audio chunk file uploads
- **axios** — Direct calls to NIM image-gen REST endpoint
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
| `NVIDIA_API_KEY` | Primary NVIDIA NIM API key |
| `NVIDIA_API_KEYS` | Comma-separated additional keys for rotation pool |
| `NVIDIA_MODEL_QUALITY` | Quality LLM (default `meta/llama-3.3-70b-instruct`) |
| `NVIDIA_MODEL_FAST` | Fast/bulk LLM (default `meta/llama-3.1-8b-instruct`) |
| `NVIDIA_MODEL_IMAGE` | Image gen model (default `black-forest-labs/flux.1-schnell`) |
| `IMAGE_GEN_DAILY_QUOTA_PER_USER` | Per-user daily image cap (default `5`) |
| `ADMIN_API_TOKEN` | Bearer token for admin endpoints |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `PYTHON_SERVICE_URL` | Python transcription service URL |

## API Routes

All routes prefixed with `/api/v1/`:

- `/auth` — Register, login, Google OAuth, token refresh
- `/sessions` — CRUD, YouTube/upload flow, transcript, translate, PDF report
- `/notes` — Generate AI notes, CRUD, export, **cover image generation** (`POST /:id/image`)
- `/chat` — RAG Q&A, history
- `/annotations` — Timestamp annotations CRUD
- `/admin` — NVIDIA NIM key pool management (requires `ADMIN_API_TOKEN`)

Static `/uploads/generated/*` serves generated images.

## Architecture

```
src/
├── config/          # Server, DB, CORS configs
├── controllers/     # Request handlers
├── middlewares/      # Auth (JWT), Upload (Multer)
├── models/          # Mongoose schemas
│   ├── llmCache.model.ts    # TTL-indexed LLM response cache
│   ├── imageQuota.model.ts  # Per-user daily image quota
│   └── ...
├── repositories/    # Data access layer
├── routes/v1/       # REST routes + Admin routes
├── services/        # Business logic
│   ├── nim.service.ts              # NIM LLM calls + model fallback chain
│   ├── nimKeyManager.service.ts    # NIM key pool (rate-limit + credit tracking)
│   ├── image.service.ts            # NIM image generation + per-user quota
│   ├── llmCache.service.ts         # Mongo-backed TTL response cache
│   ├── embedding.service.ts        # Local hash-based embeddings (zero API calls)
│   ├── report.service.ts           # PDF report generation
│   └── ...
├── types/           # TypeScript interfaces
└── utils/           # Error handling, logging
```

## NVIDIA NIM Key Rotation

The `NimKeyManager` manages a pool of API keys with two-state tracking:
- **Active** — eligible for round-robin selection
- **Rate-limited** — temporary cooldown (parses retry-after; default 65s); auto-reactivated by background timer (10s interval)
- **Credit-exhausted** — permanent (NIM free credits are lifetime, not refilled); requires manual re-add via admin endpoint

On error, the service first tries the configured **fallback model on the same key** before rotating to a new key — this maximizes credit usage per key.

A Mongo-backed **LLM response cache** (TTL: 24h notes / 7d translation / 1h chat) avoids burning credits on identical prompts.

## Smart Model Routing

| Tier | Model (default) | Fallback | Used For |
|------|-----------------|----------|----------|
| **Quality** | `meta/llama-3.3-70b-instruct` | `nvidia/llama-3.1-nemotron-70b-instruct` | Notes, Chat Q&A |
| **Fast** | `meta/llama-3.1-8b-instruct` | `mistralai/mistral-small-24b-instruct` | Translation, mindmap/flowchart |
| **Image** | `black-forest-labs/flux.1-schnell` | `stabilityai/stable-diffusion-3-medium` | Cover image generation |

## PDF Reports

`GET /api/v1/sessions/:id/report` generates a comprehensive PDF containing:
- Title page with session metadata
- Table of contents
- Summary, detailed notes, visual diagrams, flashcards, study guide
- User annotations with timestamps
- Full transcript with timestamps
- Page numbers
