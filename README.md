# Daily QC Defect Log — Android, Web & Docker

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
# Run on any available port (e.g., 8080, 8088, 5000)
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

## 📱 Native Android APK from GitHub

This repository contains an automated **GitHub Actions Workflow** (`.github/workflows/android.yml`) that compiles and builds a native Android APK (`.apk`) every time code is pushed or exported to GitHub.

### How to Download the APK from GitHub:
1. Open this repository on **GitHub**.
2. Click on the **Actions** tab at the top.
3. Click on the latest workflow run named **Build Android APK**.
4. Scroll down to the **Artifacts** section at the bottom of the page.
5. Click **Daily-QC-Defect-Log-Android-APK** to download the zip containing `app-debug.apk`.
6. Transfer `app-debug.apk` to your Android device and tap to install and run natively!

---

## 🛠 Local Android Development with Capacitor

If you want to build and run the APK on your local machine using Android Studio:

### Prerequisites:
- Node.js (v18+)
- Android Studio with Android SDK installed

### Commands:
```bash
# 1. Install dependencies
npm install

# 2. Build the web app and sync with Capacitor
npm run android:sync

# 3. Open project in Android Studio to run on an emulator or physical Android phone
npm run android:open
```

Or build the APK directly via Gradle CLI:
```bash
cd android
./gradlew assembleDebug
```
The compiled APK will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🚀 Web & PWA Mode
You can also run the web app in development or production mode:

```bash
# Start Vite development server
npm run dev

# Production build
npm run build
```
When accessed from Chrome on an Android phone, you can also tap **"Add to Home screen"** to install it as an offline-ready Progressive Web App (PWA).
