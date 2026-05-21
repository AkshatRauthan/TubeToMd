# TubeToMD — Implementation Plan

> **Date:** May 2026
> **Status:** ✅ Core Migration Complete · 🔄 HuggingFace Deployment Planned

---

## Migration History

### Phase 1: Gemini → Groq (March 2026) ✅

Migrated from Google Gemini (severely rate-limited free tier) to Groq API for all AI features.

### Phase 2: Groq → NVIDIA NIM (May 2026) ✅

Migrated all LLM features (notes, chat, translation, image generation) from Groq to NVIDIA NIM (`build.nvidia.com`). **Whisper transcription remains on Groq** — NIM does not offer a hosted Whisper API endpoint.

| Component | Before (Groq) | After (NVIDIA NIM) |
|-----------|---------------|---------------------|
| **LLM (Notes, Chat)** | Llama 3.3 70B via Groq | Llama 3.3 70B via NIM (`meta/llama-3.3-70b-instruct`) |
| **LLM Fallback** | N/A | Nemotron 70B (`nvidia/llama-3.1-nemotron-70b-instruct`) |
| **LLM (Translation)** | Llama 3.1 8B via Groq | Llama 3.1 8B via NIM (`meta/llama-3.1-8b-instruct`) |
| **LLM Fallback (Fast)** | N/A | Mistral Small 24B (`mistralai/mistral-small-24b-instruct`) |
| **Image Generation** | N/A | FLUX.1-schnell + SD3-medium fallback via NIM |
| **Transcription** | Groq Whisper (`whisper-large-v3-turbo`) | **Still Groq Whisper** (not migrated — NIM Whisper is self-host only) |
| **Embeddings** | Local hash-based (384-dim) | No change |
| **Key Rotation** | Groq key circular queue | NIM `NimKeyManager` with fallback-model-before-rotate + credit exhaustion tracking |
| **LLM Cache** | None | Mongo-backed TTL cache (24h notes / 7d translation / 1h chat) |

---

## Groq Whisper — Actual Free Tier Limits (Reality Check)

### Verified Free Tier Limits (as of May 2026)

| Limit | Value | What It Means |
|-------|-------|---------------|
| **RPM** (Requests/Minute) | **20** | Max 1 chunk every 3 seconds |
| **RPD** (Requests/Day) | **2,000** | Enough for ~400 five-chunk video uploads/day |
| **ASH** (Audio Seconds/Hour) | **7,200** | = 2 hours of audio per hour |
| **ASD** (Audio Seconds/Day) | **28,800** | = 8 hours of audio per day total |
| **File Size** | **25 MB** per request | Must chunk large files (already handled) |
| **Min Charge** | **10 seconds** per request | Even short clips cost 10s of quota |

### Critical Constraints

1. **Organization-Level Limits** — Rate limits apply per Groq organization, NOT per API key. Creating multiple keys under the same account does NOT multiply your quota. Key rotation is useless for Whisper on Groq.

2. **20 RPM Bottleneck** — With chunk-based transcription, concurrent users can easily hit this. Two users uploading 10-chunk videos simultaneously = 20 RPM maxed instantly → 429 errors.

3. **Intermittent 500 Errors** — Users report random `500 Internal Server Error` responses from Groq Whisper. Retry logic with exponential backoff is essential but not yet implemented in `whisper_service.py`.

4. **25 MB File Limit** — Already handled by frontend FFmpeg.wasm chunking, but chunks should stay under ~20 MB for safety margin.

### Capacity Math for TubeToMD

| Daily Uploaders | Chunks (5 each) | RPD Used | ASD Used (15-min videos) | Status |
|-----------------|-----------------|----------|--------------------------|--------|
| 10 | 50 | 2.5% | 31% (9,000s) | ✅ Fine |
| 30 | 150 | 7.5% | 94% (27,000s) | ⚠️ Tight |
| 32+ | 160+ | 8% | **>100%** | ❌ ASD exceeded |
| 50 | 250 | 12.5% | 156% | ❌ Broken |

**Conclusion:** Groq Whisper free tier supports **~30 daily uploaders** of 15-minute videos before hitting the ASD wall. For a portfolio/demo deployment on HuggingFace, this is sufficient.

### Required Hardening (TODO)

- [ ] Add retry logic with exponential backoff to `whisper_service.py` for transient 500 errors
- [ ] Implement RPM throttling — stagger chunk submissions (3-second gaps) instead of parallel bursts
- [ ] Monitor `x-ratelimit-remaining` response headers to preemptively slow down
- [ ] Add user-facing queue when rate-limited instead of hard failure
- [ ] Sequential chunk processing with configurable concurrency (default: 1 at a time for free tier)

---

## HuggingFace Deployment Plan

### Target: Deploy both backends to HuggingFace Spaces (free tier)

#### HuggingFace Spaces Free Tier Resources

| Resource | Free Tier |
|----------|-----------|
| **CPU** | 2 vCPUs |
| **RAM** | 16 GB |
| **Disk** | 50 GB (ephemeral — lost on restart) |
| **GPU** | None (ZeroGPU requires Gradio SDK, not Docker) |
| **Port** | Must listen on **7860** |
| **SDK** | Docker (required for Express + FastAPI) |

#### Deployment Architecture

```
┌──────────────────────────────────┐
│  HF Space 1 (Docker)            │
│  Node.js Express Backend        │
│  Port: 7860                     │
│  Secrets: NVIDIA_API_KEY,       │
│    MONGODB_URI, JWT_SECRET,     │
│    PYTHON_SERVICE_URL (→ Space 2)│
└────────────┬─────────────────────┘
             │ HTTP
┌────────────▼─────────────────────┐
│  HF Space 2 (Docker)            │
│  Python FastAPI                  │
│  Port: 7860                     │
│  Secrets: GROQ_API_KEY          │
│  → Groq Whisper API (remote)    │
│  → youtube-transcript-api       │
└──────────────────────────────────┘
```

#### Why Groq Whisper Works on HF Free Tier

Groq Whisper is a **remote API call** — the Python service sends audio to Groq's servers and gets a transcript back. It does NOT run Whisper locally. This means:

- **No GPU needed** — pure HTTP calls, works on 2-vCPU HF free tier
- **Minimal RAM** — FastAPI + Groq SDK uses ~50 MB
- **No model download** — no cold-start penalty

#### Alternatives Evaluated

| Option | Verdict | Why |
|--------|---------|-----|
| **Groq Whisper API** (current) | ✅ Keep | Already implemented, fast, free, no local compute |
| HuggingFace Inference API | ❌ | ~2MB payload limit too small for audio chunks |
| Local faster-whisper (CPU) | ❌ | 10-30x slower than real-time on 2 vCPUs |
| NVIDIA NIM Whisper | ❌ | Self-host only, no free hosted API endpoint |
| Cloudflare Workers AI | ⚠️ Backup | Viable fallback if Groq ever becomes unavailable |

#### Deployment Checklist

- [ ] Create HF Space 1 (Docker SDK) for Node.js backend
- [ ] Create HF Space 2 (Docker SDK) for Python FastAPI
- [ ] Update Dockerfiles to expose port 7860
- [ ] Set `PYTHON_SERVICE_URL` in Space 1 to Space 2's public URL
- [ ] Configure all secrets in HF Space settings
- [ ] Test cross-space communication
- [ ] Frontend deployment (Vercel/Netlify or 3rd HF Space)

---

## Current AI Provider Summary

| Concern | Provider | Model / Endpoint | Free Tier |
|---------|----------|-------------------|-----------|
| **LLM (Quality)** | NVIDIA NIM | `meta/llama-3.3-70b-instruct` | ~1000 credits/key (lifetime) |
| **LLM (Fast)** | NVIDIA NIM | `meta/llama-3.1-8b-instruct` | Same credit pool |
| **Image Gen** | NVIDIA NIM | `black-forest-labs/flux.1-schnell` | Same credit pool |
| **Transcription** | Groq | `whisper-large-v3-turbo` | 2,000 RPD / 28,800 ASD |
| **YouTube Transcripts** | None (library) | `youtube-transcript-api` | Unlimited (scrapes captions) |
| **Embeddings** | Local | Hash-based 384-dim | Zero API calls |

---

## Future Improvements

1. **Whisper Hardening** — Retry logic, RPM throttling, header monitoring (see TODO above)
2. **Multi-Provider Fallback** — Auto-switch to HF Inference API or Cloudflare Workers AI if Groq hits limits
3. **Semantic Embeddings** — Upgrade from hash-based to a local transformer model (e.g., `all-MiniLM-L6-v2`)
4. **Response Streaming** — Implement SSE streaming for chat/notes to improve perceived performance
5. **Batch Processing** — Use Groq's Batch API for non-time-sensitive transcription jobs
