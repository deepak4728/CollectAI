import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes';
import { setupGeminiLiveWebSocket } from './server/liveVoice';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer(app);

  app.use(express.json({ limit: '10mb' }));

  // Request logger for API calls
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Mount REST API Router
  app.use('/api', apiRouter);

  // Mount Gemini 3.8 Live WebSocket
  setupGeminiLiveWebSocket(server);

  // In development, hook Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built frontend
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CollectAI Full-Stack Server with Voice Live API listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
