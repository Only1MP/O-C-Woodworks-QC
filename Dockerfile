# ========================================================
# Multi-Stage Lightweight Dockerfile for Daily QC Defect Log Full-Stack
# Embedded database & REST API running on Raspberry Pi / ARM64
# ========================================================

# --------------------------------------------------------
# Stage 1: Build static frontend assets
# --------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit || npm install --no-audit

# Copy application source code and build configs
COPY index.html tsconfig.json vite.config.ts ./
COPY src/ ./src/
COPY public/ ./public/

# Compile production Vite bundle into /app/dist
RUN npm install @rollup/rollup-linux-arm64-musl lightningcss-linux-arm64-musl @tailwindcss/oxide-linux-arm64-musl || true
RUN npm run build

# --------------------------------------------------------
# Stage 2: Lightweight Node Production Server with Embedded Database
# --------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

LABEL maintainer="Woodshop QC Team"
LABEL description="Full-stack container for Daily QC Defect Log with embedded server database"

ENV PORT=80
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV DATABASE_PATH=/app/data/qc_store.json

# Copy production package specifications
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit || npm install --omit=dev --no-audit

# Install tsx globally or locally for executing server.ts directly on Node Alpine
RUN npm install -g tsx

# Copy compiled frontend dist from builder stage
COPY --from=builder /app/dist /app/dist

# Copy backend server scripts
COPY server.ts server-routes.ts server-db.ts ./

# Create data directory for volume mount
RUN mkdir -p /app/data

# Expose standard web port
EXPOSE 80

# Health check against server health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/healthz || exit 1

# Launch the unified server
CMD ["tsx", "server.ts"]
