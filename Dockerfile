# ========================================================
# Multi-Stage Lightweight Dockerfile for Daily QC Defect Log Full-Stack
# Embedded database & REST API running on Raspberry Pi / ARM64
# ========================================================

# --------------------------------------------------------
# Stage 1: Build static frontend assets and bundle server
# --------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Explicitly ensure native build packages are present for alpine arm64
RUN npm install @rollup/rollup-linux-arm64-musl lightningcss-linux-arm64-musl @tailwindcss/oxide-linux-arm64-musl || true

# Install dependencies
RUN npm ci --prefer-offline --no-audit || npm install --no-audit

# Copy application source code and configs
COPY index.html tsconfig.json vite.config.ts server.ts server-routes.ts server-db.ts ./
COPY src/ ./src/
COPY public/ ./public/

# Compile frontend into /app/dist and backend into /app/server.mjs
RUN npm run build

# --------------------------------------------------------
# Stage 2: Ultra-lightweight Node Production Server
# No Rollup, no Vite, no TypeScript compiler needed at runtime!
# --------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

LABEL maintainer="Woodshop QC Team"
LABEL description="Full-stack production container for Daily QC Defect Log"

ENV PORT=80
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV DATABASE_PATH=/app/data/qc_store.json

# Copy production package specifications
COPY package.json package-lock.json* ./

# Install only production dependencies (express, bcryptjs, cookie-parser, jsonwebtoken)
# No devDependencies (vite, rollup, tsx) are needed at runtime
RUN npm install --omit=dev --no-audit

# Copy compiled frontend and compiled server from builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/server.mjs /app/server.mjs

# Create data directory for volume mount
RUN mkdir -p /app/data

# Expose standard web port
EXPOSE 80

# Health check against server health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/healthz || exit 1

# Run compiled Node.js server directly
CMD ["node", "server.mjs"]
