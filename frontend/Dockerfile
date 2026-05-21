# ──────────────────────────────────────────────────────────────
# TubeToMD Frontend — Production Dockerfile
# ──────────────────────────────────────────────────────────────
# Used by: docker-compose.prod.yml
# Features: Multi-stage build, Nginx for serving, SPA routing
#
# Build arg VITE_API_URL controls the backend API URL baked
# into the static bundle at build time.
# ──────────────────────────────────────────────────────────────

# ── Build Stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build arg — backend API URL (baked into static JS at build time)
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Nginx Stage ───────────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing config (all routes → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
