# TubeToMD — Groq Migration Implementation Plan

> **Date:** March 2026
> **Status:** ✅ Complete

---

## Goal

Migrate TubeToMD's entire AI pipeline from Google Gemini (severely rate-limited on free tier) to **Groq API** — achieving a free, fast, and reliable AI backend.

---

## Problem

- Google Gemini free tier rate-limits after a single API call
- Local Whisper transcription requires heavy compute/GPU resources
- All AI features (notes, chat, translation, embeddings) were broken due to rate limits

---

## Solution: Groq API

| Component | Before (Gemini) | After (Groq) |
|-----------|-----------------|---------------|
| **LLM (Notes, Chat)** | Gemini 2.0 Flash | Llama 3.3 70B (`llama-3.3-70b-versatile`) — 1,000 RPD |
| **LLM (Translation)** | Gemini 2.0 Flash | Llama 3.1 8B (`llama-3.1-8b-instant`) — 14,400 RPD |
| **Transcription** | Local OpenAI Whisper | Groq Whisper API (`whisper-large-v3-turbo`) |
| **Embeddings** | Gemini `text-embedding-004` | Local hash-based (384-dim, zero API calls) |
| **Key Rotation** | Gemini key circular queue | Groq key circular queue (same pattern) |

---

## Changes Made

### Backend (TypeScript) — 10 files

| File | Change |
|------|--------|
| `groq.service.ts` | **[NEW]** Main LLM service with smart model routing |
| `groqKeyManager.service.ts` | **[NEW]** Circular key queue with auto-reactivation |
| `embedding.service.ts` | Local hash-based 384-dim vectors (zero API calls) |
| `notes.service.ts` | `geminiService` → `groqService` |
| `chat.service.ts` | `geminiService` → `groqService` |
| `session.service.ts` | `geminiService` → `groqService` |
| `admin.routes.ts` | `geminiKeyManager` → `groqKeyManager` |
| `services/index.ts` | Export `groqService` |
| `server.config.ts` | `GEMINI_API_KEY` → `GROQ_API_KEY` |
| `config/index.ts` | Removed dead Gemini imports |

### Python Service — 3 files

| File | Change |
|------|--------|
| `whisper_service.py` | Local Whisper → Groq `whisper-large-v3-turbo` API |
| `config.py` | `WHISPER_MODEL` → `GROQ_API_KEY` |
| `requirements.txt` | `openai-whisper` → `groq` |

### Frontend — 1 file

| File | Change |
|------|--------|
| `LandingPage.tsx` | All "Gemini AI" text → "Groq AI" |

### Docs & Config — 7 files

| File | Change |
|------|--------|
| `README.md` | Full rewrite for Groq |
| `backend/README.md` | Full rewrite for Groq |
| `docs/ARCHITECTURE.md` | Full rewrite for Groq |
| `backend/.env` | `GEMINI_API_KEY` → `GROQ_API_KEY` |
| `backend/.env.example` | Updated for Groq |
| `python/.env.example` | Updated for Groq |
| `backend/package.json` | Removed `@google/generative-ai`, added `groq-sdk` |

### Deleted Files

| File | Reason |
|------|--------|
| `gemini.service.ts` | Replaced by `groq.service.ts` |
| `geminiKeyManager.service.ts` | Replaced by `groqKeyManager.service.ts` |
| `gemini.config.ts` | No longer needed |

---

## Setup Instructions

### 1. Get a Groq API Key (free, no credit card)
→ [console.groq.com/keys](https://console.groq.com/keys)

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
GROQ_API_KEY=gsk_your_key_here
# GROQ_API_KEYS=gsk_key2,gsk_key3  # Optional: additional keys
```

**Python** (`python/.env`):
```env
GROQ_API_KEY=gsk_your_key_here
```

### 3. Install Dependencies

```bash
# Backend
cd backend && npm install

# Python
cd python && pip install -r requirements.txt
```

### 4. Start Services

```bash
# Terminal 1 — Python
cd python && uvicorn main:app --reload

# Terminal 2 — Backend
cd backend && npm run dev

# Terminal 3 — Frontend
cd frontend && npm run dev
```

---

## Groq Free Tier Rate Limits

| Resource | Limit |
|----------|-------|
| Llama 3.3 70B | 1,000 requests/day, 6,000 tokens/min |
| Llama 3.1 8B | 14,400 requests/day, 30,000 tokens/min |
| Whisper Large V3 Turbo | 7,200 requests/day |

With key rotation (N keys), effective limits multiply by N.

---

## Future Improvements

1. **Response Caching** — Cache AI outputs in MongoDB to avoid redundant API calls
2. **Streaming** — Implement streaming for chat/notes to improve perceived performance
3. **Multi-Provider Fallback** — Auto-switch to Cerebras/Together if Groq hits limits
4. **Batch Processing** — Leverage Groq's high RPM for parallel note generation
5. **Semantic Embeddings** — Upgrade from hash-based to a local transformer model (e.g., `all-MiniLM-L6-v2`)
