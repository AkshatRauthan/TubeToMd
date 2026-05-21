# Deployment Guide for TubeToMD 🚀

This guide covers **two deployment paths** — local development (via Docker Compose) and production deployment (Docker Compose or HuggingFace Spaces). Both work on **Linux and Windows**.

---

## Quick Reference

| Path | Command | What It Does |
|------|---------|-------------|
| **Local Dev** | `docker compose up --build` | All 3 services with hot-reload |
| **Production** | `docker compose -f docker-compose.prod.yml up --build -d` | All 3 services, optimized builds, Nginx |
| **HuggingFace** | Push `Dockerfile.hf` + code to HF Spaces | Each backend as a separate HF Space |

---

## Docker File Map

```
TubeToMD/
├── docker-compose.yml            ← Local dev (hot-reload, volumes)
├── docker-compose.prod.yml       ← Production (multi-stage, Nginx)
├── .env                          ← Shared env vars (all compose files read this)
│
├── backend/
│   ├── Dockerfile                ← Production build (dynamic PORT via env)
│   ├── Dockerfile.dev            ← Dev build (ts-node-dev hot-reload)
│   ├── Dockerfile.hf             ← HuggingFace Spaces (port 7860)
│   └── .dockerignore
│
├── python/
│   ├── Dockerfile                ← Production build (dynamic PORT via env)
│   ├── Dockerfile.hf             ← HuggingFace Spaces (port 7860)
│   └── .dockerignore
│
└── frontend/
    ├── Dockerfile                ← Production build (Nginx + SPA routing)
    ├── Dockerfile.dev            ← Dev build (Vite dev server + HMR)
    ├── nginx.conf                ← SPA routing config for Nginx
    └── .dockerignore
```

---

## Path 1: Local Development 🛠️

> **For:** Day-to-day coding on your machine. Hot-reload, volume mounts, source maps.

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) (includes Docker Compose v2)
  - **Windows:** Docker Desktop with WSL 2 backend
  - **Linux:** Docker Engine + Docker Compose plugin
- Root `.env` file with your API keys (see [Environment Configuration](#environment-configuration))

### Run

```bash
# Linux / macOS / Windows (PowerShell or CMD)
docker compose up --build
```

### What Happens

| Service | Port | Features |
|---------|------|----------|
| **Python** | `localhost:8000` | Uvicorn with `--reload`, source volume-mounted |
| **Backend** | `localhost:5000` | ts-node-dev with hot-reload, `src/` volume-mounted |
| **Frontend** | `localhost:5173` | Vite dev server with HMR, `src/` volume-mounted |

- Edit any source file → container auto-reloads
- Python health check runs automatically
- Backend waits for Python to be healthy before starting
- All services read env vars from root `.env`

### Stop

```bash
docker compose down
```

### Rebuild After Dependency Changes

```bash
# If you change package.json or requirements.txt:
docker compose up --build
```

---

## Path 2: Production (Docker Compose) 🏭

> **For:** Self-hosting on a VPS, home server, or cloud VM. Optimized builds, no source mounts.

### Run

```bash
# Linux / macOS / Windows (PowerShell or CMD)
docker compose -f docker-compose.prod.yml up --build -d
```

### What Happens

| Service | Port | Features |
|---------|------|----------|
| **Python** | `localhost:8000` | Production Uvicorn, no reload |
| **Backend** | `localhost:3000` | Multi-stage build, production Node.js |
| **Frontend** | `localhost:80` | Nginx serving static SPA build |

### Custom Frontend API URL

The frontend is a static build — the backend URL is baked in at build time. To point it at a custom backend:

```bash
# Linux / macOS
VITE_API_URL=https://api.yourdomain.com/api docker compose -f docker-compose.prod.yml up --build -d

# Windows PowerShell
$env:VITE_API_URL="https://api.yourdomain.com/api"; docker compose -f docker-compose.prod.yml up --build -d

# Windows CMD
set VITE_API_URL=https://api.yourdomain.com/api && docker compose -f docker-compose.prod.yml up --build -d
```

### Monitoring

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Stream logs
docker compose -f docker-compose.prod.yml logs -f

# Logs for a specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### Stop / Reset

```bash
# Stop
docker compose -f docker-compose.prod.yml down

# Full reset (rebuild images from scratch)
docker compose -f docker-compose.prod.yml down --rmi all
docker compose -f docker-compose.prod.yml up --build -d
```

---

## Path 3: HuggingFace Spaces (Separate Backends) ☁️

> **For:** Free cloud deployment. Each backend is deployed as a separate HF Space (Docker SDK).

### Architecture

```
┌──────────────────────────────────┐
│  HF Space 1 (Docker)            │
│  Node.js Express Backend        │
│  Port: 7860                     │
│  Uses: Dockerfile.hf            │
│  Env: NVIDIA_API_KEY, MONGO_URI │
│  → calls Python Space via URL   │
└────────────┬─────────────────────┘
             │ HTTP
┌────────────▼─────────────────────┐
│  HF Space 2 (Docker)            │
│  Python FastAPI                  │
│  Port: 7860                     │
│  Uses: Dockerfile.hf            │
│  Env: GROQ_API_KEY              │
│  → Groq Whisper API (remote)    │
│  → youtube-transcript-api       │
└──────────────────────────────────┘

Frontend → Vercel / Netlify / 3rd HF Space
```

### Step-by-Step

#### 1. Deploy Python Space

```bash
# Create a new HF Space (Docker SDK)
# Clone the Space repo, then:
cp python/Dockerfile.hf <space-repo>/Dockerfile
cp -r python/app python/main.py python/requirements.txt <space-repo>/

# Push to HF
cd <space-repo>
git add . && git commit -m "Deploy Python service" && git push
```

**Set these Secrets in HF Space Settings:**

| Secret | Value |
|--------|-------|
| `GROQ_API_KEY` | Your Groq API key |
| `MAX_FILE_SIZE_MB` | `500` (optional) |

#### 2. Deploy Backend Space

```bash
# Create a new HF Space (Docker SDK)
# Clone the Space repo, then:
cp backend/Dockerfile.hf <space-repo>/Dockerfile
cp -r backend/src backend/package*.json backend/tsconfig.json <space-repo>/

# Push to HF
cd <space-repo>
git add . && git commit -m "Deploy backend service" && git push
```

**Set these Secrets in HF Space Settings:**

| Secret | Value |
|--------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A secure random string |
| `JWT_REFRESH_SECRET` | A secure random string |
| `NVIDIA_API_KEY` | Your NVIDIA NIM key |
| `NVIDIA_API_KEYS` | Optional comma-separated rotation pool |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_API_TOKEN` | Bearer token for admin endpoints |
| `PYTHON_SERVICE_URL` | `https://<user>-<python-space-name>.hf.space` |
| `FRONTEND_URL` | Your frontend domain (for CORS) |

#### 3. Deploy Frontend

Deploy to **Vercel** or **Netlify** (recommended for static SPA):

```bash
# Set the env variable during build:
VITE_API_URL=https://<user>-<backend-space-name>.hf.space/api
```

### HuggingFace Free Tier Resources

| Resource | Limit |
|----------|-------|
| CPU | 2 vCPUs |
| RAM | 16 GB |
| Disk | 50 GB (ephemeral — lost on restart) |
| GPU | None (ZeroGPU requires Gradio SDK) |
| Port | Must be **7860** |

Both backends are pure API gateways — no local AI models. 2 vCPUs is more than enough.

---

## Environment Configuration 🔑

All deployment paths read from the root `.env` file. Copy `.env.example` to `.env` and fill in:

```bash
# Linux / macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

# Windows CMD
copy .env.example .env
```

### Required Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Backend | MongoDB Atlas connection string |
| `JWT_SECRET` | Backend | JWT access token secret |
| `JWT_REFRESH_SECRET` | Backend | JWT refresh token secret |
| `NVIDIA_API_KEY` | Backend | Primary NVIDIA NIM key |
| `GROQ_API_KEY` | Python | Groq Whisper API key (transcription) |

### Optional Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `NVIDIA_API_KEYS` | Backend | Comma-separated rotation pool |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Backend | Google OAuth |
| `ADMIN_API_TOKEN` | Backend | Admin endpoint auth |
| `IMAGE_GEN_DAILY_QUOTA_PER_USER` | Backend | Per-user image gen cap (default: 5) |
| `MAX_FILE_SIZE_MB` | Python | Max upload size (default: 500) |

---

## Groq Whisper Rate Limits ⚠️

Whisper transcription is the only remaining Groq dependency.

| Limit | Value | Meaning |
|-------|-------|---------|
| **RPM** | 20 | Max 1 chunk every 3 seconds |
| **RPD** | 2,000 | ~400 five-chunk video uploads/day |
| **ASD** | 28,800 | ~8 hours of audio per day |
| **File Size** | 25 MB | Frontend chunks audio to stay under this |

**Critical:** Limits are **org-level** — multiple API keys under the same Groq account do NOT multiply quota.

---

## Cross-Platform Notes 🖥️

### Windows-Specific

- Use **Docker Desktop with WSL 2 backend** for best performance
- Volume mounts work automatically with Docker Desktop
- Use PowerShell or CMD — both work with `docker compose` commands
- Line endings: ensure your `.env` file uses LF (not CRLF) — Docker can fail with CRLF in env files

### Linux-Specific

- Install Docker Engine + Docker Compose plugin (not the legacy `docker-compose` binary)
- If running without `sudo`, add your user to the `docker` group:
  ```bash
  sudo usermod -aG docker $USER
  ```

### Both Platforms

- Docker Desktop v4+ includes `docker compose` (v2) — no need for separate `docker-compose` install
- All Dockerfiles use Linux-based images (`alpine`, `slim`) — they run identically on both platforms via Docker's Linux container engine
