# Daily QC Defect Log — Docker App

A Quality Control defect tallying app designed for woodshop inspection, real-time defect tracking, shift auditing, and containerized deployment.

---

## 🐳 Lightweight Docker Container

This repository is fully containerized as an ultra-lightweight, production-ready Docker image (~25MB total footprint) using a multi-stage build:
- **Build Stage**: Compiles modern Vite/React/TypeScript assets with `node:22-alpine`.
- **Runtime Stage**: Serves optimized static assets using `nginx:alpine-slim` with gzip compression, long-term asset caching, security headers, SPA client-side routing fallback, and native `/healthz` healthchecks.
- **Resource Footprint**: Starts in <100ms and consumes <15MB RAM at runtime.

### Quick Start with Docker Compose:

You can change the external host port by either setting `HOST_PORT` inline or in a `.env` file:
```bash
# Run on any available port (e.g., 8080, 8088, 3000)
HOST_PORT=8080 docker compose up -d --build
```
The app will be live at `http://localhost:8080` (or `http://<tailscale-ip>:8080`).

To view logs or stop the container:
```bash
docker compose logs -f
docker compose down
```

### Quick Start with Docker CLI:
```bash
# 1. Build the lightweight image
docker build -t daily-qc-defect-log .

# 2. Run the container on any port you choose (e.g. 8080 instead of 3000)
docker run -d -p 8080:80 --name qc-defect-log daily-qc-defect-log

# 3. Check health status
curl http://localhost:8080/healthz
```

Or using the npm script shortcuts:
```bash
npm run docker:build
npm run docker:run
npm run docker:stop
```

### Dynamic Port Configuration & Cloud Deployments:
The Dockerfile includes dynamic port substitution via the `PORT` environment variable, making it directly compatible with Google Cloud Run, AWS ECS/Fargate, Azure Container Apps, or Kubernetes:
```bash
# Run on custom port (e.g. 8080)
docker run -d -e PORT=8080 -p 8080:8080 daily-qc-defect-log
```

---

## 💻 Local Development

```bash
# Start Vite development server locally
npm run dev

# Production build test
npm run build
```

