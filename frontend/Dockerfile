FROM node:20-alpine AS builder

WORKDIR /app

# Copy configuration and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Nginx stage for serving static files
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposed port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
