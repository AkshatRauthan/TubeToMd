# TubeToMD

> **Turn any YouTube video or uploaded video into structured AI-powered study notes, mind maps, flashcards, and more.**

TubeToMD extracts transcripts from YouTube videos (or user-uploaded videos via browser-side FFmpeg), then leverages **Groq AI (Llama 3.3 70B)** to generate rich Markdown study materials — summaries, detailed notes, mind maps, flowcharts, flashcards, and study guides. It also provides a **RAG-based Q&A chat**, transcript **translation** (20 languages), **timestamp annotations**, and **PDF report downloads**.

---

## Features

- **YouTube Transcript Extraction** — Paste any YouTube URL; transcripts are fetched automatically with timestamps
- **Video Upload with Groq Whisper** — Upload video files; audio is extracted in-browser with FFmpeg.wasm, chunked, and transcribed via Groq Whisper API (`whisper-large-v3-turbo`)
- **AI Note Generation** — 6 note types: Summary, Detailed Notes, Mind Map, Flowchart, Flashcards, Study Guide
- **7 Summary Personas** — Detailed, Executive, ELI5, Code-Heavy, Actionable, Academic, Custom
- **RAG-Powered Chat** — Ask questions about the video; answers cite specific timestamps via MongoDB Atlas Vector Search
- **Transcript Translation** — Translate transcripts into 20 languages using Groq AI (Llama 3.1 8B)
- **Mermaid Diagram Rendering** — Mind maps and flowcharts rendered as interactive Mermaid.js diagrams
- **Timestamp Annotations** — Add notes at specific timestamps; hover-to-annotate on transcript lines
- **Video-Transcript Sync** — Active transcript line highlights as the video plays (250ms polling)
- **Editable Session Titles** — Inline rename sessions from the session page
- **Session Deduplication** — Re-opening the same YouTube URL navigates to the existing session
- **Dashboard with Thumbnails** — Grid tile layout with YouTube thumbnails, duration badges, and status indicators
- **PDF Report Download** — Comprehensive PDF with title page, TOC, all notes, annotations, and full transcript
- **Groq API Key Rotation** — Circular queue of N API keys with auto-exhaustion tracking and background reactivation
- **Admin Key Management** — Protected REST endpoints to add/remove/monitor Groq API keys at runtime
- **JWT Auth + Google OAuth** — Email/password registration with optional Google account linking

---

## Tech Stack

| Layer | Technology |
|-------|-----------||
| **Frontend** | React 19 · TypeScript · Vite 7 · TailwindCSS v4 · Zustand · TanStack Query · Framer Motion · Mermaid.js |
| **Backend** | Express 5 · TypeScript · Mongoose 8 · JWT · pdfkit · groq-sdk |
| **Transcription** | Python FastAPI · Groq Whisper API (`whisper-large-v3-turbo`) · youtube-transcript-api |
| **Database** | MongoDB Atlas (with Atlas Vector Search for RAG) |
| **AI** | Groq Llama 3.3 70B (notes, chat) · Groq Llama 3.1 8B (translation) · Local hash-based embeddings |

---

## Architecture

```
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│   React Frontend    │◄─────►│  Node.js Backend    │◄─────►│  Python FastAPI      │
│   (Vite + Tailwind) │ REST  │  (Express 5 + TS)   │ REST  │  (Groq Whisper API)  │
│   port 5173         │       │  port 5000          │       │  port 8000           │
└─────────────────────┘       └──────────┬──────────┘       └──────────────────────┘
                                         │
                              ┌──────────┼──────────┐
                              │          │          │
                       ┌──────▼───┐ ┌────▼─────┐ ┌──▼──────────┐
                       │ MongoDB  │ │ Groq AI  │ │ Google      │
                       │ Atlas    │ │ (Key     │ │ OAuth       │
                       │ (Vector  │ │ Rotation │ │ Provider    │
                       │  Search) │ │  Pool)   │ │             │
                       └──────────┘ └──────────┘ └─────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.9
- **MongoDB** (Atlas recommended for Vector Search)
- **FFmpeg** installed on your system (for audio processing)
- A **Groq API key** — get one free at [console.groq.com/keys](https://console.groq.com/keys)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/TubeToMD.git
cd TubeToMD
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env       # Fill in your environment variables
npm install
npm run dev                 # Starts on http://localhost:5000
```

### 3. Python Transcription Service

```bash
cd python
cp .env.example .env       # Fill in your environment variables
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev                 # Starts on http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for JWT access tokens |
| `JWT_REFRESH_SECRET` | Secret for JWT refresh tokens |
| `GROQ_API_KEY` | Primary Groq API key |
| `GROQ_API_KEYS` | Comma-separated list of additional Groq keys for rotation |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `PYTHON_SERVICE_URL` | URL of the Python service (default: `http://localhost:8000`) |
| `FRONTEND_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |
| `ADMIN_API_TOKEN` | Bearer token for admin API endpoints |

### Python (`python/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `8000`) |
| `GROQ_API_KEY` | Groq API key (for Whisper transcription) |
| `MAX_FILE_SIZE_MB` | Max upload file size in MB |

---

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register with email/password |
| POST | `/login` | Login with email/password |
| GET | `/google` | Initiate Google OAuth |
| GET | `/google/callback` | Google OAuth callback |
| POST | `/refresh` | Refresh JWT token |
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update user profile |

### Sessions (`/api/v1/sessions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/youtube` | Create session from YouTube URL |
| POST | `/upload/init` | Initialize upload session |
| POST | `/upload/chunk` | Upload audio chunk |
| POST | `/upload/complete` | Merge chunks & finalize |
| GET | `/` | List all user sessions |
| GET | `/find-by-url` | Find existing session by video URL |
| GET | `/:id` | Get session details |
| PUT | `/:id` | Update session (rename) |
| DELETE | `/:id` | Delete session |
| GET | `/:id/transcript` | Get transcript (supports `?start=X&end=Y`) |
| GET | `/:id/report` | Download PDF report |
| POST | `/:id/translate` | Translate transcript |
| POST | `/:id/restore-original` | Restore original transcript |

### Notes (`/api/v1/notes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate notes (type + persona) |
| GET | `/` | List notes for session |
| GET | `/:noteId` | Get specific note |
| PUT | `/:noteId` | Edit note |
| DELETE | `/:noteId` | Delete note |
| GET | `/:noteId/export` | Export as Markdown/HTML |

### Chat (`/api/v1/chat`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/message` | Send RAG Q&A message |
| GET | `/history` | Get chat history |
| DELETE | `/history` | Clear chat history |

### Annotations (`/api/v1/annotations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create annotation |
| GET | `/` | List annotations |
| PUT | `/:annotationId` | Update annotation |
| DELETE | `/:annotationId` | Delete annotation |

### Admin (`/api/v1/admin`) — requires `Authorization: Bearer <ADMIN_API_TOKEN>`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groq-keys` | Get status of all API keys in pool |
| POST | `/groq-keys` | Add a new key to rotation pool |
| DELETE | `/groq-keys` | Remove a key from pool |

---

## Project Structure

```
TubeToMD/
├── backend/
│   ├── src/
│   │   ├── config/          # Server, DB, CORS configs
│   │   ├── controllers/     # Auth, Session, Notes, Chat, Annotation
│   │   ├── middlewares/      # Auth (JWT), Upload (Multer)
│   │   ├── models/           # Mongoose models (User, Session, Note, etc.)
│   │   ├── repositories/     # Data access layer
│   │   ├── routes/v1/        # REST routes + Admin routes
│   │   ├── services/         # Business logic
│   │   │   ├── groq.service.ts             # LLM calls with smart model routing
│   │   │   ├── groqKeyManager.service.ts   # Circular key queue manager
│   │   │   ├── embedding.service.ts        # Local hash-based embeddings
│   │   │   ├── report.service.ts           # PDF report generation
│   │   │   ├── session.service.ts          # Session CRUD + dedup
│   │   │   └── ...
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # Error handling, logging, helpers
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # DashboardPage, SessionPage, Landing, Auth
│   │   ├── components/       # UI components
│   │   ├── hooks/            # useVideoProcessor, useAuth, etc.
│   │   ├── lib/              # Axios API client
│   │   ├── stores/           # Zustand auth store
│   │   └── types/            # TypeScript types
│   └── package.json
├── python/
│   ├── main.py               # FastAPI app
│   ├── app/
│   │   ├── services/         # YouTube & Groq Whisper transcription
│   │   ├── routes/           # Transcription endpoints
│   │   └── utils/            # Audio processing (FFmpeg)
│   └── requirements.txt
└── docs/
    ├── FEATURES.md           # Feature tracking & roadmap
    ├── ARCHITECTURE.md       # Technical architecture docs
    └── implementation_plan.md # Groq migration implementation plan
```

---

## Key Workflows

### YouTube Video → Notes
1. User pastes a YouTube URL on the dashboard
2. Backend checks for existing session (deduplication)
3. If new: creates session → calls Python service for transcript → generates embeddings → marks ready
4. Frontend loads 3-column session view: video player | transcript | notes/chat

### Uploaded Video → Notes
1. User selects a video file in the dashboard
2. Frontend loads FFmpeg.wasm, extracts audio (mono 16kHz WAV), splits into ~5 min chunks
3. Chunks uploaded in parallel batches (3 concurrent) to backend
4. Each chunk forwarded to Python/Groq Whisper API for transcription
5. Backend merges all chunks, generates embeddings → session ready

### Groq Key Rotation
1. Keys loaded from `GROQ_API_KEY` + `GROQ_API_KEYS` env vars on startup
2. Each LLM call picks the next key via round-robin
3. On 429/quota error: key marked exhausted with parsed refill timer
4. Background timer (10s interval) reactivates keys once refill window elapses
5. Admin can add/remove keys at runtime via `/api/v1/admin/groq-keys`

---

## Documentation

- [docs/FEATURES.md](docs/FEATURES.md) — Feature tracking and roadmap
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Detailed technical architecture
- [docs/implementation_plan.md](docs/implementation_plan.md) — Groq migration implementation plan

---

## Author

**Akshat Rauthan**

---

## License

ISC
