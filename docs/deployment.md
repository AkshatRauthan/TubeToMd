# Deployment Guide for TubeToMD 🚀

This guide provides step-by-step instructions for deploying TubeToMD using a modern, containerized strategy integrated with MongoDB Atlas and GitHub Actions.

## Architecture & Services 🏗️

The application utilizes a distributed architecture managed by Docker Compose:
1. **Frontend**: Vite + React SPA served via Nginx.
2. **Backend**: Express + Node.js (Node 24) handles API routing and business logic.
3. **Python Worker**: FastAPI + Python handles media processing and Whisper transcription (Groq Whisper API).
4. **AI Provider**: NVIDIA NIM (LLM + image generation) — backend talks to it via the OpenAI-compatible endpoint.
4. **Data Layer**: Hosted remotely via **MongoDB Atlas** for high availability and persistence.

---

## 1. Prerequisites ⚡

Ensure your deployment machine has the following:
- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- **MongoDB Atlas Cluster**: A running cluster with a valid connection string.
- **NVIDIA NIM API Key(s)**: Essential for LLM features (notes, chat, translation) and image generation. Get free keys at [build.nvidia.com](https://build.nvidia.com) — mobile OTP verification required, ~1000 free credits per key. Recommended: 2–3 keys for rotation.
- **Groq API Key**: Required only for Whisper transcription of uploaded videos.

---

## 2. Environment Configuration 🔑

TubeToMD uses a centralized environment configuration for Docker deployment. 

### A. Create Root .env
Copy the root `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```

### B. Required Variables
Fill in the following in your root `.env`:
- `MONGODB_URI`: Your Atlas connection string.
- `NVIDIA_API_KEY`: Primary NVIDIA NIM key (LLM + image generation).
- `NVIDIA_API_KEYS`: Optional — comma-separated rotation pool for resilience.
- `GROQ_API_KEY`: Required only if you want Whisper-based transcription for uploaded videos.
- `JWT_SECRET`: A secure random string for authentication.
- `GOOGLE_CLIENT_ID` / `SECRET`: Required if using Google Login.
- `IMAGE_GEN_DAILY_QUOTA_PER_USER`: Per-user image gen cap (default `5`).

> [!TIP]
> This root `.env` file is automatically injected into all three containers by Docker Compose, eliminating the need to manage separate files in subdirectories.

---

## 3. Starting the Application 🚦

From the project root, run:

```bash
# Build and start the entire stack in the background
docker compose up --build -d
```

### Checking Status
Verify all services are running:
```bash
docker compose ps
```

To view streaming logs (useful for debugging AI process completion):
```bash
docker compose logs -f
```

---

## 4. CI/CD with GitHub Actions 🤖

TubeToMD is equipped with automated testing to ensure stability.

### Workflow Configuration
- **Branches**: Automated tests trigger on every push or pull request to `TubeToMD-Prod` and `TubeToMD-Dev`.
- **Backend Tests**: Automatically spins up a temporary MongoDB service container for isolated verification.
- **Frontend Tests**: Runs Vitest suite to ensure UI integrity.

> [!IMPORTANT]
> Always check the **Actions** tab in GitHub after a push. Never merge if the CI tests are failing.

---

## 5. Production Best Practices 🔒

### SSL/TLS & Reverse Proxy
Never expose internal ports directly. Use a reverse proxy like **Nginx Proxy Manager**, **Traefik**, or **Caddy** to handle SSL termination and map traffic to:
- Frontend: `localhost:5173`
- Backend API: `localhost:3000` (internal mapping)

### Key Rotation
NVIDIA NIM free credits are *lifetime per account* (not refilled per minute), so rotation across multiple keys multiplies your total budget. Provide a comma-separated list (2–3 keys is realistic given mobile-OTP verification):

```
NVIDIA_API_KEYS=key1,key2,key3
```

The `NimKeyManager` automatically:
- Round-robins between active keys
- Cools rate-limited keys (parses retry-after headers, default 65s) and reactivates them
- **Permanently disables** keys that hit `402 insufficient credits` — re-add via `POST /api/v1/admin/nim-keys` once you have new keys
- Falls back to the configured fallback model on the same key before rotating, to maximize per-key credit usage

A Mongo-backed LLM response cache (TTL: 24h notes / 7d translation / 1h chat) further reduces credit burn on repeated prompts.

---

## 6. Maintenance 🛠️

**Stop services:**
```bash
docker compose stop
```

**Full Reset (Rebuild images):**
```bash
docker compose down --rmi all
docker compose up --build -d
```

**Debug a specific service:**
```bash
docker compose logs -f backend
```
