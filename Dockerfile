# ========================================================
# Multi-Stage Lightweight Dockerfile for Daily QC Defect Log
# Resulting container image size: ~25MB (Nginx Alpine)
# ========================================================

# --------------------------------------------------------
# Stage 1: Build static assets using Node.js Alpine
# --------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies (fallback to npm install if package-lock is out of sync)
RUN npm ci --prefer-offline --no-audit || npm install --no-audit

# Copy application source code and build configs
COPY index.html tsconfig.json vite.config.ts ./
COPY src/ ./src/
COPY public/ ./public/

# Compile production Vite bundle into /app/dist
RUN npm install @rollup/rollup-linux-arm64-musl lightningcss-linux-arm64-musl @tailwindcss/oxide-linux-arm64-musl
RUN npm run build

# --------------------------------------------------------
# Stage 2: Ultra-lightweight production server (Nginx Alpine)
# --------------------------------------------------------
FROM nginx:alpine-slim AS runner

LABEL maintainer="Woodshop QC Team"
LABEL description="Lightweight production container for Daily QC Defect Log SPA"

# Default port to listen on (can be overridden via -e PORT=8080 or Cloud Run)
ENV PORT=80
# Restrict envsubst to ONLY substitute ${PORT}, preserving Nginx variables like $uri
ENV NGINX_ENVSUBST_FILTER="PORT"

# Clean out default Nginx static files and configs
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/*

# Copy built distribution files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx template for dynamic PORT substitution on container startup
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Generate static fallback config with port 80 in case entrypoint template processing is bypassed
RUN sed 's/\${PORT}/80/g' /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Expose standard web port
EXPOSE 80

# Health check to ensure Nginx is actively responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/healthz || exit 1

# Launch Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
