# ──────────────────────────────────────────────────────────────
# TubeToMD Backend — Production Dockerfile
# ──────────────────────────────────────────────────────────────
# Used by: docker-compose.prod.yml, HuggingFace Spaces
# Features: Multi-stage build, production deps only, small image
#
# Supports dynamic PORT via environment variable:
#   - docker-compose.prod.yml → PORT=3000
#   - HuggingFace Spaces      → PORT=7860
# ──────────────────────────────────────────────────────────────

# ── Build Stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production Stage ──────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Create uploads directory (cross-platform safe)
RUN mkdir -p /app/uploads

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Default port (overridden by env in compose/HF)
ENV PORT=3000

# Expose both possible ports
EXPOSE 3000 7860

CMD ["node", "dist/index.js"]
