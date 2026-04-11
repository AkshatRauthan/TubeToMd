# Deployment Guide for TubeToMD 🚀

This guide provides step-by-step instructions for deploying TubeToMD to a production or local environment using the newly configured Docker containerization strategy.

## Architecture & Services 🏗️

The application consists of four primary containers managed by Docker Compose:
1. **Frontend**: Vite + React SPA served via Nginx (alpine).
2. **Backend**: Express + Node.js (alpine) handles API routing, db interactions, authentication, and validation.
3. **Python Worker**: FastAPI + Python (slim) + ffmpeg. Handles media ingestion, chunking, and interfaces with the Groq Whisper API.
4. **MongoDB**: The primary database (local container usage for simple deployment, which can be swapped for MongoDB Atlas).

---

## 1. Prerequisites ⚡

Ensure your deployment machine (or local system) has the following installed:
- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+ recommended)

**External Secrets Required**:
You will need API keys for the following services:
- **Groq API Key**: Get it at [console.groq.com/keys](https://console.groq.com/keys).
- **Google OAuth Credentials**: Get them from [Google Cloud Console](https://console.cloud.google.com) (Optional, but required for Google Sign-in to function).

---

## 2. Environment Configuration 🔑

Each service expects certain environment variables. Copy the `.env.example` templates to `.env` files in each service directory and fill them in.

### A. Backend Variables
Create `/backend/.env`:
```env
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/tubetomd
JWT_SECRET=your-random-secure-string
JWT_REFRESH_SECRET=your-random-secure-string-2
JWT_EXPIRY=1d
JWT_REFRESH_EXPIRY=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
GROQ_API_KEY=your-groq-api-key
PYTHON_SERVICE_URL=http://python:8000
FRONTEND_URL=http://localhost:5173
```
> [!NOTE]
> If deploying to a live domain, change `localhost:5173` / `localhost:3000` to your actual domains (e.g., `https://tubetomd.com`).

### B. Python Variables
Create `/python/.env`:
```env
PORT=8000
GROQ_API_KEY=your-groq-api-key
MAX_FILE_SIZE_MB=500
UPLOAD_DIR=./uploads
```

### C. Frontend Variables
Create `/frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api/v1
```
> [!NOTE]
> Ensure `VITE_API_URL` correctly points to the public URL of your *Backend* API service so client browsers can reach it perfectly.

---

## 3. Starting the Application 🚦

Navigate to the root directory where `docker-compose.yml` is located and run:

```bash
# Build the images and start the containers in detached mode
docker compose up --build -d
```

### Checking Status
Verify all services are running:
```bash
docker compose ps
```
You should see states as `Up` for `tubetomd_mongodb`, `tubetomd_python`, `tubetomd_backend`, and `tubetomd_frontend`.

To view streaming logs for all services:
```bash
docker compose logs -f
```

---

## 4. Accessing the Application 🌐

By default, the services will map the following ports to your host machine:

- **Frontend Application:** `http://localhost:5173` (Routes handled by Nginx)
- **Node.js API:** `http://localhost:3000`
- **Python Service:** `http://localhost:8000`
- **MongoDB:** `localhost:27017`

---

## 5. Production Considerations 🔒

When deploying this stack to a public-facing VPS (like DigitalOcean, AWS EC2, or Hetzner), please follow these best practices:

### A. Reverse Proxy with SSL / TLS
Never expose raw Node/Nginx HTTP ports to external traffic directly if users are logging in.
Use an external reverse proxy (like **Nginx Proxy Manager**, **Caddy**, or **Traefik**) listening on ports `80`/`443`.
Configure the proxy to issue Let's Encrypt certificates and forward traffic to `localhost:5173`.

### B. Production MongoDB (Atlas)
Instead of relying on the local Docker MongoDB container (which works perfectly for small or single-user instances), it is highly recommended to shift to a managed DB cluster for high-availability.
- Change `MONGODB_URI` in `docker-compose.yml` and `.env` formats to point to your cluster:
  `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/TubeToMD`

### C. Watch out for CORS
If your frontend runs on `https://app.tubetomd.com` and backend runs on `https://api.tubetomd.com`, ensure the Backend's `FRONTEND_URL` environment variable accurately reflects this, so CORS policies don't reject requests.

---

## 6. Maintenance Commands 🛠️

**Stop safely without deleting volumes (your database will stay intact):**
```bash
docker compose stop
```

**Restart the services after changing an `.env` file:**
```bash
docker compose up -d
```

**Perform a clean teardown (WARNING: Removes MongoDB local storage volumes if you pass `-v`)**:
```bash
docker compose down
```

**Accessing a container's shell (e.g., Backend) for debugging:**
```bash
docker exec -it tubetomd_backend sh
```
