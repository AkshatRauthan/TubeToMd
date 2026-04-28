# Deployment Guide for TubeToMD 🚀

This guide provides step-by-step instructions for deploying TubeToMD using a modern, containerized strategy integrated with MongoDB Atlas and GitHub Actions.

## Architecture & Services 🏗️

The application utilizes a distributed architecture managed by Docker Compose:
1. **Frontend**: Vite + React SPA served via Nginx.
2. **Backend**: Express + Node.js (Node 24) handles API routing and business logic.
3. **Python Worker**: FastAPI + Python handles media processing and interfaces with Groq AI.
4. **Data Layer**: Hosted remotely via **MongoDB Atlas** for high availability and persistence.

---

## 1. Prerequisites ⚡

Ensure your deployment machine has the following:
- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- **MongoDB Atlas Cluster**: A running cluster with a valid connection string.
- **Groq API Key**: Essential for AI-driven transcription and notes.

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
- `GROQ_API_KEY`: Your primary Groq key.
- `JWT_SECRET`: A secure random string for authentication.
- `GOOGLE_CLIENT_ID` / `SECRET`: Required if using Google Login.

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
If you have multiple Groq accounts to avoid rate limits, you can provide a comma-separated list:
`GROQ_API_KEYS=key1,key2,key3`

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
