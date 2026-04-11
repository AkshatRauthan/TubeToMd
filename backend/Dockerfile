FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Exposed port
EXPOSE 3000

# Start command
CMD ["node", "-r", "tsconfig-paths/register", "dist/server.js"]
