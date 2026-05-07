# TubeToMD — Architecture & Technical Design

> **Last Updated:** May 2026
> **Author:** Akshat Rauthan

> ### Migration Notice (May 2026)
> The LLM stack migrated from **Groq → NVIDIA NIM** (`build.nvidia.com`). All chat / notes / translation calls now use NIM's OpenAI-compatible endpoint. Image generation was added (FLUX.1-schnell, SD3-medium fallback). Whisper transcription is still served by Groq (separate concern, not migrated). Wherever this document still references "Groq" for LLM features, mentally substitute "NVIDIA NIM" — the architectural roles are identical, only the provider and model names changed (see §3 AI/ML and §6a). The new key manager (`NimKeyManager`) additionally tracks per-key *credit exhaustion* (NIM credits are lifetime, not refilled) and supports **fallback-model-before-rotate**, plus a Mongo-backed LLM response cache.

---

## 1. Overview

TubeToMD is a full-stack platform that extracts knowledge from YouTube videos and user-uploaded videos, converting them into structured Markdown notes, summaries, mind maps, flowcharts, flashcards, and interactive Q&A sessions powered by a RAG (Retrieval-Augmented Generation) system.

---

## 2. High-Level Architecture

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
│                     │        │                     │        │                     │
│   React Frontend    │◄──────►│  Node.js Backend    │◄──────►│  Python FastAPI Svc  │
│  (Vite + Tailwind   │  REST  │  (Express + TS)     │  REST  │  (Groq Whisper API) │
│   + shadcn/ui)      │        │                     │        │                     │
│                     │        │                     │        │                     │
└─────────────────────┘        └──────────┬──────────┘        └─────────────────────┘
                                          │
                               ┌──────────┼──────────┐
                               │          │          │
                        ┌──────▼───┐ ┌────▼─────┐ ┌──▼──────────┐
                        │ MongoDB  │ │ NVIDIA   │ │ Google      │
                        │ Atlas    │ │ NIM      │ │ OAuth       │
                        │ (Vector  │ │ (LLM +   │ │ Provider    │
                        │ + Cache) │ │ Image)   │ │             │
                        └──────────┘ └──────────┘ └─────────────┘
                                          │
                                   ┌──────▼─────┐
                                   │ Groq Whisper│  (transcription only)
                                   └─────────────┘
```

### Service Responsibilities

| Service | Port | Role |
|---------|------|------|
| **React Frontend** | 5173 | UI — 3-column session view, dashboard tiles, video player, Markdown editor, chat |
| **Node.js Backend** | 5000 | API gateway, auth, session management, LLM orchestration, key rotation, PDF reports, export |
| **Python FastAPI** | 8000 | Transcription (Groq Whisper API + youtube-transcript-api) |
| **MongoDB** | 27017 | Data persistence + vector search for RAG |

---

## 3. Tech Stack

### Frontend
- **React 19** + **Vite 7** — fast dev server, HMR
- **TailwindCSS v4** — utility-first styling
- **React Router v7** — client-side routing
- **TanStack Query** — server state management
- **Zustand** — lightweight client state
- **YouTube IFrame API** (`YT.Player`) — YouTube video playback with seekTo/getCurrentTime
- **FFmpeg.wasm** — browser-side audio extraction from uploaded videos
- **react-markdown** — Markdown rendering
- **mermaid** — mind maps, flowcharts, diagrams rendered interactively
- **Framer Motion** — page/component animations
- **Sonner** — toast notifications
- **Lucide React** — icon library
- **Axios** — HTTP client

### Node.js Backend
- **Express 5** + **TypeScript** — REST API
- **Mongoose 8** — MongoDB ODM
- **jsonwebtoken** — JWT auth (access + refresh tokens)
- **bcryptjs** — password hashing
- **multer** — audio chunk uploads (no video storage on backend)
- **openai** SDK — used in OpenAI-compatible mode against NVIDIA NIM (`https://integrate.api.nvidia.com/v1`); custom `NimKeyManager` wraps it with rotation pool, fallback-model chain, and credit-exhaustion tracking
- **axios** — direct calls to NIM image-generation REST endpoint (`https://ai.api.nvidia.com/v1/genai/...`) for FLUX/SD3 (non-OpenAI-shaped)
- **pdfkit** — PDF report generation (title page, TOC, notes, transcript)
- **node-cron** — scheduled cleanup tasks
- **luxon** — date/time formatting
- **uuid** — unique ID generation

### Python FastAPI Service
- **FastAPI** — async REST API
- **uvicorn** — ASGI server
- **groq** — Groq Whisper API client (`whisper-large-v3-turbo`)
- **youtube-transcript-api** — YouTube transcript fetching
- **yt-dlp** — YouTube audio extraction
- **ffmpeg** — audio processing
- **pydantic** — request/response validation

### Database
- **MongoDB Atlas** — primary database
- **MongoDB Atlas Vector Search** — embeddings for RAG Q&A

### AI/ML
- **NVIDIA NIM Llama 3.3 70B** (`meta/llama-3.3-70b-instruct`) — quality-tier LLM for notes, chat Q&A
- **NVIDIA NIM Nemotron 70B** (`nvidia/llama-3.1-nemotron-70b-instruct`) — quality-tier fallback (NVIDIA-hosted, very stable uptime)
- **NVIDIA NIM Llama 3.1 8B** (`meta/llama-3.1-8b-instruct`) — fast/bulk LLM for translation, mindmap/flowchart generation
- **NVIDIA NIM Mistral Small 24B** (`mistralai/mistral-small-24b-instruct`) — fast-tier fallback
- **NVIDIA NIM FLUX.1-schnell** (`black-forest-labs/flux.1-schnell`) — image generation primary (4-step distilled, ~1s, low credit cost)
- **NVIDIA NIM Stable Diffusion 3 Medium** (`stabilityai/stable-diffusion-3-medium`) — image-gen fallback
- **Groq Whisper** (`whisper-large-v3-turbo`) — speech-to-text transcription (kept on Groq; not migrated to NIM)
- **Local hash-based embeddings** — 384-dim vector embeddings for RAG (zero API calls)
- **NIM Key Rotation** — round-robin pool with rate-limit cooldown + permanent credit-exhaustion tracking, fallback-model-before-rotate, Mongo-backed TTL response cache

---

## 4. Database Schema

### 4.1 Users Collection
```typescript
{
  _id: ObjectId,
  email: string,           // unique, lowercase
  password?: string,       // bcrypt hashed (null if OAuth-only)
  name: string,
  avatar?: string,
  googleId?: string,       // for Google OAuth linking
  authMethods: ['local' | 'google'][],  // tracks which auth methods are set up
  preferences: {
    defaultPersona: string,  // default summary style
    language: string,        // preferred output language
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 Sessions Collection (one per video)
```typescript
{
  _id: ObjectId,
  userId: ObjectId,         // ref: Users
  title: string,            // video title
  videoType: 'youtube' | 'uploaded',
  videoUrl?: string,        // YouTube URL (no videoPath — video is never stored on backend)
  thumbnailUrl?: string,
  duration?: number,        // seconds
  transcription: [{
    start: number,          // seconds
    duration: number,       // seconds
    text: string
  }],
  status: 'processing' | 'transcribing' | 'transcribed' | 'ready' | 'failed',
  errorMessage?: string,
  metadata: {
    channel?: string,
    uploadDate?: string,
    description?: string,
    language?: string
  },
  timeRange?: {             // for partial transcription
    start: number,
    end: number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 4.3 Notes Collection
```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,      // ref: Sessions
  userId: ObjectId,         // ref: Users
  type: 'summary' | 'detailed_notes' | 'mindmap' | 'flowchart' |
        'diagram' | 'flashcards' | 'resources' | 'custom',
  title: string,
  content: string,          // Markdown content
  persona?: string,         // summary style used
  startTimestamp?: number,  // for timestamp-specific generation
  endTimestamp?: number,
  topic?: string,           // for topic-specific generation
  isEdited: boolean,
  mermaidCode?: string,     // for mind maps / flowcharts
  imageUrl?: string,        // for AI-generated diagrams
  exportFormats: string[],  // available export formats
  createdAt: Date,
  updatedAt: Date
}
```

### 4.4 ChatMessages Collection (RAG Q&A)
```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,      // ref: Sessions
  userId: ObjectId,         // ref: Users
  role: 'user' | 'assistant',
  content: string,
  sources: [{               // citations from transcript
    text: string,
    startTimestamp: number,
    endTimestamp: number
  }],
  createdAt: Date
}
```

### 4.5 Embeddings Collection (Vector Search)
```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,      // ref: Sessions
  chunkText: string,        // transcript chunk
  chunkIndex: number,
  startTimestamp: number,
  endTimestamp: number,
  embedding: number[],      // 384-dim vector (local hash-based embedding)
}
// Atlas Vector Search Index on 'embedding' field
```

### 4.6 Annotations Collection
```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,      // ref: Sessions
  userId: ObjectId,         // ref: Users
  selectedText: string,     // highlighted text
  highlightColor: string,   // hex color
  note?: string,            // user's annotation
  startTimestamp?: number,
  endTimestamp?: number,
  appendedToNoteId?: ObjectId,  // ref: Notes (if appended)
  createdAt: Date
}
```

---

## 5. API Design

### 5.1 Auth Routes (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register with email/password |
| POST | `/login` | Login with email/password |
| GET | `/google` | Initiate Google OAuth |
| GET | `/google/callback` | Google OAuth callback |
| POST | `/link-google` | Link Google to existing account |
| POST | `/set-password` | Set password for OAuth-only account |
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update user profile |
| POST | `/refresh` | Refresh JWT token |

### 5.2 Session Routes (`/api/v1/sessions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/youtube` | Create session from YouTube URL |
| POST | `/upload/init` | Initialize upload session (returns sessionId) |
| POST | `/upload/chunk` | Upload & transcribe a single audio chunk |
| POST | `/upload/complete` | Merge all chunks, generate embeddings |
| GET | `/upload/progress/:id` | Get chunk upload progress |
| GET | `/` | List all user sessions |
| GET | `/find-by-url` | Find existing session by video URL (deduplication) |
| GET | `/:id` | Get session details |
| PUT | `/:id` | Update session (rename title) |
| DELETE | `/:id` | Delete session |
| GET | `/:id/transcript` | Get full transcript |
| GET | `/:id/transcript?start=X&end=Y` | Get partial transcript |
| GET | `/:id/report` | Download PDF report (title page, TOC, notes, annotations, transcript) |
| POST | `/:id/translate` | Translate transcript to target language |
| POST | `/:id/restore-original` | Restore original (untranslated) transcript |

### 5.3 Notes Routes (`/api/v1/sessions/:sessionId/notes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate notes (summary/mindmap/etc.) |
| GET | `/` | List all notes for session |
| GET | `/:noteId` | Get specific note |
| PUT | `/:noteId` | Edit note content |
| DELETE | `/:noteId` | Delete note |
| GET | `/:noteId/export?format=md\|pdf\|docx\|html` | Export note |

### 5.4 Chat Routes (`/api/v1/sessions/:sessionId/chat`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/message` | Send message (RAG Q&A) |
| GET | `/history` | Get chat history |
| DELETE | `/history` | Clear chat history |

### 5.5 Annotations Routes (`/api/v1/sessions/:sessionId/annotations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create annotation/highlight |
| GET | `/` | List annotations |
| PUT | `/:annotationId` | Edit annotation |
| DELETE | `/:annotationId` | Delete annotation |
| POST | `/:annotationId/append-to-note` | Append to note |

### 5.6 Admin Routes (`/api/v1/admin`) — Protected by `ADMIN_API_TOKEN` bearer auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nim-keys` | Get status of all NIM API keys (masked keys, active / rate-limited / credit-exhausted counts, refill times) |
| POST | `/nim-keys` | Add a new NVIDIA NIM API key to the rotation pool (`{ key, label? }`) |
| DELETE | `/nim-keys` | Remove a key from the pool (`{ key }`) |

### 5.7 Python FastAPI Endpoints (`http://localhost:8000`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transcribe/youtube` | Get YT transcript with timestamps |
| POST | `/transcribe/upload` | Transcribe uploaded audio/video (legacy) |
| POST | `/transcribe/chunk` | Transcribe a single audio chunk (Groq Whisper) |
| POST | `/transcribe/merge` | Merge chunk transcriptions |
| GET | `/health` | Health check |

---

## 6a. Groq Key Rotation System

TubeToMD uses a **circular queue key manager** for resilient Groq API access:

```
┌─────────────────────────────────────────────────────────────┐
│                   GroqKeyManager (Singleton)                 │
├─────────────────────────────────────────────────────────────┤
│  keys: GroqKey[]            ← loaded from GROQ_API_KEY +    │
│                                GROQ_API_KEYS env vars       │
│  currentIndex: number       ← round-robin pointer           │
│  clientCache: Map<string, Groq>                              │
├─────────────────────────────────────────────────────────────┤
│  getClient()        → next active key → Groq client          │
│  markExhausted(key) → parses retry-after, sets refill timer │
│  addKey() / removeKey() / getStatus()                       │
├─────────────────────────────────────────────────────────────┤
│  Background: setInterval(reactivateKeys, 10s)               │
│    → checks each exhausted key's refillAt vs now            │
│    → reactivates keys whose window has elapsed              │
└─────────────────────────────────────────────────────────────┘
```

### Smart Model Routing

| Model | RPD Limit | Used For |
|-------|-----------|----------|
| `llama-3.3-70b-versatile` | 1,000 | Notes, Chat Q&A (quality-critical) |
| `llama-3.1-8b-instant` | 14,400 | Translation (bulk tasks) |

**Flow:**
1. `callGroq(prompt, model)` gets the next key via round-robin
2. On success → return result
3. On 429/RATE_LIMITED → `markExhausted(key, error)` parses retry-after seconds, sets `refillAt`, tries next key
4. If all keys exhausted → throws error with estimated wait time
5. Background timer (every 10s) reactivates keys whose refill window has passed

**Admin endpoints** allow runtime key management without server restart.

---

## 7. Key Workflows

### 7.1 YouTube Video Flow
```
User enters YT URL
    → Frontend sends URL to Node.js Backend
    → Backend creates Session (status: 'processing')
    → Backend calls Python FastAPI /transcribe/youtube
    → Python uses youtube-transcript-api to fetch transcript
    → Returns timestamped transcript to Backend
    → Backend stores transcript in Session
    → Backend generates local embeddings and stores in Embeddings collection
    → Session status → 'ready'
    → Frontend loads split-screen view
```

### 7.2 Uploaded Video Flow (Chunk-Based Pipeline)
```
User selects video file (max 512MB / 60 min)
    → Frontend loads FFmpeg.wasm in browser
    → FFmpeg.wasm extracts audio (mono 16kHz WAV) — zero video on backend
    → Frontend splits audio into ~5 min chunks
    → Frontend calls POST /upload/init (filename, totalChunks) → gets sessionId
    → For each chunk (parallel batches of 3):
        → Frontend uploads audio chunk to POST /upload/chunk
        → Backend (multer) saves chunk temporarily
        → Backend forwards chunk to Python /transcribe/chunk (with chunk_offset)
        → Python sends to Groq Whisper API → returns offset-adjusted timestamps
        → Backend stores result in memory, deletes chunk file
        → Backend returns ACK → Frontend frees chunk from memory (GC)
    → Frontend calls POST /upload/complete
    → Backend merges all chunk transcriptions via Python /transcribe/merge
    → Backend deduplicates overlapping edges, stores merged transcript
    → Backend generates local embeddings
    → Session status → 'ready'
    → For video replay: user selects same file from disk (URL.createObjectURL)
```

### 7.3 RAG Q&A Flow
```
User asks question
    → Backend generates local embedding for question
    → MongoDB Atlas Vector Search finds top-K relevant transcript chunks
    → Backend constructs prompt: system context + relevant chunks + user question
    → Groq Llama 70B generates answer with citations
    → Response includes answer + source timestamps
    → Frontend shows answer with clickable timestamp links
```

### 7.4 Note Generation Flow
```
User selects type (summary/mindmap/flowchart/etc.) + optional persona + optional time range
    → Backend fetches transcript (full or filtered by time range)
    → Backend constructs specialized prompt based on type + persona
    → Groq Llama 70B generates structured Markdown / Mermaid code
    → Backend stores Note in database
    → Frontend renders the note (Markdown / Mermaid diagram)
    → User can edit, re-generate, or export
```

---

## 8. Summary Personas

| Persona | Description |
|---------|-------------|
| `detailed` | Comprehensive notes with all key points, code blocks, examples |
| `executive` | High-level summary for quick overview |
| `eli5` | "Explain Like I'm 5" — simplified concepts |
| `code-heavy` | Focus on code examples, technical details |
| `actionable` | Action items, steps, takeaways |
| `academic` | Academic style with citations and references |
| `custom` | User-defined custom prompt |

---

## 9. Frontend Page Structure

```
/                       → Landing page
/auth/login             → Login (email/pwd + Google OAuth)
/auth/register          → Register
/dashboard              → Session library — grid tiles with YouTube thumbnails, 
                          duration badges, status indicators, download report,
                          YouTube URL input, video upload with progress
/session/:id            → 3-column layout
    ├── Left:   YouTube IFrame API player (YT.Player) / uploaded video player
    ├── Center: Transcript panel
    │   ├── Clickable timestamps (seekTo video)
    │   ├── Auto-scroll toggle
    │   ├── Active line highlighting (250ms sync)
    │   ├── Hover action buttons (annotate)
    │   └── Annotation popup (add/delete notes at timestamp)
    ├── Right:  Tabbed view
    │   ├── Notes — 6 generation buttons, Markdown + Mermaid rendering
    │   ├── Chat — RAG Q&A with source timestamps
    │   └── Translation — 20 languages, translate/restore
    ├── Editable session title (inline rename)
    └── PDF Report download
```

---

## 10. Environment Variables

### Node.js Backend (`.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRY=1d
JWT_REFRESH_EXPIRY=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
NVIDIA_API_KEY=your_primary_nvidia_nim_key
NVIDIA_API_KEYS=key1,key2,key3              # Optional: additional keys for rotation pool
GROQ_API_KEY=your_groq_key                 # Required only for Whisper transcription
IMAGE_GEN_DAILY_QUOTA_PER_USER=5           # Per-user daily image gen cap (0 = disabled)
ADMIN_API_TOKEN=your_admin_secret_token     # Bearer token for /api/v1/admin/* endpoints
PYTHON_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
```

### Python FastAPI (`.env`)
```env
PORT=8000
GROQ_API_KEY=your_groq_api_key
MAX_FILE_SIZE_MB=500
UPLOAD_DIR=./uploads
```

### React Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 11. Folder Structure

### Node.js Backend
```
backend/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── config/
│   │   ├── cors.config.ts
│   │   ├── database.config.ts
│   │   ├── server.config.ts        # PORT, DB, JWT, OAuth, Groq, Admin token
│   │   └── index.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── session.controller.ts   # + updateSession, findExistingSession, generateReport
│   │   ├── notes.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── annotation.controller.ts
│   │   └── index.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── index.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── session.model.ts
│   │   ├── note.model.ts
│   │   ├── chatMessage.model.ts
│   │   ├── embedding.model.ts
│   │   ├── annotation.model.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── session.repository.ts
│   │   ├── note.repository.ts
│   │   ├── chatMessage.repository.ts
│   │   ├── embedding.repository.ts
│   │   ├── annotation.repository.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── index.ts
│   │   └── v1/
│   │       ├── auth.routes.ts
│   │       ├── session.routes.ts    # + PUT /:id, GET /find-by-url, GET /:id/report, translate, restore
│   │       ├── notes.routes.ts
│   │       ├── chat.routes.ts
│   │       ├── annotation.routes.ts
│   │       ├── admin.routes.ts      # Groq key management (GET/POST/DELETE)
│   │       └── index.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── session.service.ts       # + updateSession(), findByVideoUrl()
│   │   ├── notes.service.ts
│   │   ├── chat.service.ts
│   │   ├── embedding.service.ts     # Local hash-based embeddings (zero API calls)
│   │   ├── nim.service.ts           # NVIDIA NIM LLM calls + model fallback chain (70B/8B)
│   │   ├── nimKeyManager.service.ts # NIM key pool (rate-limit + credit tracking)
│   │   ├── image.service.ts         # NIM image gen (FLUX / SD3) + per-user quota
│   │   ├── llmCache.service.ts      # Mongo-backed TTL LLM response cache
│   │   ├── groqKeyManager.service.ts  # Circular queue key rotation singleton
│   │   ├── report.service.ts        # PDF report generation (pdfkit)
│   │   ├── export.service.ts
│   │   ├── transcription.service.ts
│   │   ├── annotation.service.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── responses.types.ts
│   └── utils/
│       ├── common/
│       │   ├── api.logger.ts
│       │   ├── error-response.ts
│       │   ├── success-response.ts
│       │   └── index.ts
│       ├── errors/
│       │   ├── custom.error.ts
│       │   ├── error.handler.ts     # Enhanced error logging
│       │   └── index.ts
│       └── helpers/
│           └── index.ts
```

### Python FastAPI Service
```
python/
├── main.py
├── requirements.txt
├── .env
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── transcription.py
│   │   └── health.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── youtube_service.py
│   │   └── whisper_service.py    # Uses Groq Whisper API (whisper-large-v3-turbo)
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   └── utils/
│       ├── __init__.py
│       └── audio.py
├── uploads/
```

### React Frontend
```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/       # Reusable UI components
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx    # Grid tiles, thumbnails, upload, report download
│   │   └── SessionPage.tsx      # 3-column: video | transcript | notes/chat
│   ├── hooks/
│   │   └── useVideoProcessor.ts # FFmpeg.wasm, chunking, parallel upload
│   ├── lib/
│   │   └── api.ts               # Axios client with JWT interceptors
│   ├── stores/
│   │   └── authStore.ts         # Zustand with persist
│   └── types/
│       └── index.ts             # Session, Note, Annotation, ChatMessage types
```

---

## 12. Security Considerations

- **Password Hashing:** bcrypt with salt rounds
- **JWT:** Access token (1d) + Refresh token (7d)
- **OAuth Linking:** When a user logs in via Google, check if email exists → link accounts
- **Audio Chunk Upload:** Validate audio MIME types, 100MB per chunk limit, auto-cleanup after transcription
- **No Video Storage:** Video never leaves the browser; only extracted audio chunks are sent to the backend
- **Admin Auth:** Separate bearer token (`ADMIN_API_TOKEN`) for admin endpoints — not tied to user JWT
- **API Key Masking:** Admin status endpoint masks key values (shows first 6 + last 4 chars only)
- **Error Sanitization:** Raw Groq API errors are never exposed to the frontend — error handler maps to user-friendly messages
- **CORS:** Whitelist frontend origin only
- **No Persistent File Storage:** Transcripts stored in MongoDB, audio chunks are ephemeral

---

## 13. Deployment Notes

- Each service (Frontend, Backend, Python) will be deployed separately
- Frontend → Vercel / Netlify
- Backend → Railway / Render / AWS
- Python → Railway / Render / AWS (no GPU needed — uses Groq Whisper API)
- MongoDB → MongoDB Atlas (managed)
- No persistent file storage needed (transcripts stored in MongoDB, audio chunks are ephemeral)

---
