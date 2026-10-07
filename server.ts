import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createApiRouter } from './server-routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Mount backend API routes before Vite middlewares
  app.use('/api', createApiRouter());

  // Healthcheck endpoint for Docker / Tailscale / Cloud Run
  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK');
  });

  if (!isProduction) {
    // Development Mode: Mount Vite's connect middleware to serve HMR / React SPA
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(PORT),
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production Mode: Serve pre-built static assets from /app/dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '1h' }));

    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[QC Server] Listening on http://0.0.0.0:${PORT} (env: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[QC Server] Startup failed:', err);
  process.exit(1);
});
