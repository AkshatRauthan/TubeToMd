# TubeToMD — Feature Tracking

> **Last Updated:** July 2025

## Implemented

### Backend (Node.js/Express 5/TypeScript)
- [x] **Project Architecture** — Full ARCHITECTURE.md document with system design, DB schema, API design, workflows
- [x] **MongoDB Models** — User, Session, Note, ChatMessage, Embedding, Annotation (Mongoose 8)
- [x] **Auth System** — JWT (access + refresh tokens), Google OAuth with account linking, bcrypt password hashing
- [x] **Auth Middleware** — JWT verification, request user augmentation, token expiry handling
- [x] **Upload Middleware** — Multer for audio chunk uploads, UUID filenames, audio MIME validation, 100MB/chunk limit
- [x] **Auth Service** — Register, login, Google OAuth (with email-based account linking), set password, link Google, refresh tokens, profile CRUD
- [x] **Session Service** — Create YouTube sessions, chunk-based upload flow, parallel Whisper transcription, session CRUD, transcript retrieval with time range filtering
- [x] **Session Deduplication** — `findByVideoUrl()` prevents duplicate sessions for the same YouTube URL
- [x] **Session Rename** — `updateSession()` with PUT endpoint for inline title editing
- [x] **Transcription Service** — Bridge to Python FastAPI for YouTube transcription, chunk-based Whisper transcription with offset adjustment
- [x] **Gemini Service** — LLM wrapper for note generation (6 types + custom), RAG Q&A, embedding generation, transcript translation (20 languages)
- [x] **Gemini Key Rotation** — `GeminiKeyManager` singleton: circular queue of N API keys, round-robin selection, auto-exhaustion on 429, parsed refill timers, background reactivation (10s interval)
- [x] **Admin API** — Protected `/api/v1/admin/gemini-keys` endpoints (GET status / POST add / DELETE remove), bearer token auth via `ADMIN_API_TOKEN`
- [x] **Embedding Service** — Transcript chunking, embedding generation/storage, MongoDB Atlas Vector Search with text fallback
- [x] **Notes Service** — Generate notes (summary, detailed, mindmap, flowchart, flashcards, resources, diagram, custom), CRUD operations
- [x] **Chat Service** — RAG-based Q&A with vector search, chat history management, Gemini integration with context
- [x] **Annotation Service** — Create/update/delete highlights, append highlighted text to notes
- [x] **Translation Service** — Gemini-powered batch translation of transcript segments (20 languages), restore-original support
- [x] **Report Service** — PDF report generation with pdfkit: title page, TOC, summary, detailed notes, visual diagrams, flashcards, study guide, user annotations, full transcript, page numbers
- [x] **Export Service** — Markdown and HTML export with styling
- [x] **Custom Summary Personas** — detailed, executive, eli5, code-heavy, actionable, academic, custom
- [x] **Controllers** — Auth, Session, Notes, Chat, Annotation (all with error handling)
- [x] **V1 Routes** — Auth, Session, Notes, Chat, Annotation, Admin route files wired to controllers
- [x] **Error Handling** — CustomError class, centralized error handler middleware, `handleGeminiError()` with user-friendly messages (no raw API errors leak to frontend)
- [x] **CORS Config** — Configured for local development
- [x] **Gemini Config** — Flash 2.0 + text-embedding-004 initialization via key manager

### Python Service (FastAPI)
- [x] **YouTube Transcription** — youtube-transcript-api with multi-format URL parsing
- [x] **Whisper Transcription** — OpenAI Whisper (configurable model), per-chunk transcription with offset-adjusted timestamps, chunk merge with edge deduplication
- [x] **Audio Utilities** — FFmpeg audio extraction (16kHz mono WAV), ffprobe duration detection
- [x] **Chunk Endpoints** — POST /transcribe/chunk (single chunk) + POST /transcribe/merge (merge all chunks)
- [x] **Health Endpoint** — Service health check
- [x] **Configuration** — Pydantic Settings, .env support, configurable Whisper model/file size limits

### Frontend (React 19 + Vite 7 + TailwindCSS v4)
- [x] **Project Scaffolding** — Vite + React 19 + TypeScript with Tailwind CSS v4
- [x] **Routing** — React Router v7 with protected routes
- [x] **Auth Store** — Zustand with persist middleware for JWT tokens
- [x] **API Client** — Axios with JWT interceptors, auto token refresh, clean error handling (no raw API error dumps)
- [x] **Landing Page** — Hero section with feature grid
- [x] **Login/Register Pages** — Email/password auth forms with error handling
- [x] **Dashboard Page** — Grid tile layout with YouTube thumbnails (`img.youtube.com/vi/{id}/mqdefault.jpg`), duration badges, status indicators, session dedup check before creating, video upload with FFmpeg.wasm progress bar, PDF report download button
- [x] **Session Page** — 3-column layout: video player (left) | transcript (center) | notes/chat (right)
- [x] **YouTube IFrame API** — `YT.Player` integration for video playback with seekTo/getCurrentTime
- [x] **Editable Session Titles** — Inline rename via pencil icon on session page
- [x] **Video Upload Hook** — useVideoProcessor: FFmpeg.wasm loading, audio extraction (mono 16kHz), chunking (~5 min), parallel batch upload (3 concurrent), abort support
- [x] **Transcript Panel** — Clickable timestamps, auto-scroll toggle, time-synced highlighting (250ms polling), larger fonts (text-base)
- [x] **Video-Transcript Sync** — Active transcript line highlights based on current video playback position
- [x] **Timestamp Annotations** — Hover action buttons on transcript lines, annotation popup (add/delete), CRUD via annotation API
- [x] **Chat Panel** — Real-time RAG Q&A with Markdown rendering, source timestamp buttons, chat history
- [x] **Note Viewer** — Markdown rendering with clickable timestamps, Mermaid diagram rendering, export buttons
- [x] **Translation UI** — Language selector dropdown (20 languages), translate/restore-original buttons
- [x] **Navbar** — Responsive with mobile menu, auth state awareness
- [x] **TypeScript Types** — Full type definitions matching backend models (including Annotation type)
- [x] **Toast Notifications** — Sonner for success/error feedback
- [x] **PDF Report Download** — Download button on dashboard tiles, generates comprehensive report via backend

---

## To Be Implemented

### High Priority
- [ ] **Google OAuth Frontend** — Google Sign-In button on login/register pages, callback handling
- [ ] **Dark Mode Toggle** — Theme switcher in navbar
- [ ] **Note Editing** — Inline Markdown editor for editing generated notes
- [ ] **Session Polling Auto-Update** — Auto-refresh UI when session finishes processing

### Medium Priority
- [ ] **Persona Selector UI** — Dropdown for selecting summary persona before generation
- [ ] **Time Range Notes** — UI for selecting transcript time range before generating notes
- [ ] **Topic-Specific Notes** — UI to specify a focus topic for note generation
- [ ] **Interactive Transcript Search** — Searchable transcript with keyword highlighting
- [ ] **Flashcard Study Mode** — Interactive flashcard flip/quiz UI
- [ ] **Session Search** — Search across all sessions by title/content
- [ ] **Responsive Session Page** — Mobile-friendly layout for 3-column view

### Lower Priority
- [ ] **DOCX Export** — Server-side DOCX generation
- [ ] **Batch Note Generation** — Generate multiple note types at once
- [ ] **Note Comparison** — Side-by-side comparison of different note versions
- [ ] **Sharing** — Share notes/sessions via public link
- [ ] **Collaboration** — Multi-user annotation on shared sessions
- [ ] **User Settings Page** — Preferences, default persona, connected accounts
- [ ] **Rate Limiting** — API rate limiting per user (express-rate-limit)
- [ ] **Input Validation** — Request body validation (zod)
- [ ] **API Documentation** — Swagger/OpenAPI spec
- [ ] **Docker Support** — Dockerfiles + docker-compose for all services
- [ ] **CI/CD Pipeline** — GitHub Actions for testing and deployment
- [ ] **Testing** — Unit tests (Jest) + E2E tests (Playwright)
- [ ] **Browser Extension** — Chrome extension for one-click transcription from YouTube

---

## Architecture Quick Reference

| Service | Port | Tech |
|---------|------|------|
| Backend API | 5000 | Express 5 + TypeScript + Mongoose 8 |
| Python Service | 8000 | FastAPI + Whisper + youtube-transcript-api |
| Frontend | 5173 | React 19 + Vite 7 + TailwindCSS v4 |
| Database | 27017 | MongoDB Atlas (Vector Search for RAG) |

### Running the Project

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Python Service
cd python && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Environment Variables

Copy the `.env.example` files in `backend/` and `python/` and fill in:
- `GEMINI_API_KEY` — Get from https://aistudio.google.com/apikey
- `GEMINI_API_KEYS` — Optional comma-separated additional keys for rotation
- `ADMIN_API_TOKEN` — Any secret string for admin API authentication
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — From Google Cloud Console (for OAuth)
- `MONGODB_URI` — Your MongoDB connection string

