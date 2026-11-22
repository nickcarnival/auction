/** Loads `express-serve-static-core` `Request.ctx` augmentation for ts-node. */
import './types/express-augment';

import dotenv from 'dotenv';
import express from 'express';
import app from './server';
import { backfillMissingTenantTrialEndsAt } from './api/tenant/tenant-service';
import { getEnv } from './utils/get-env';
import path from 'path';

dotenv.config({ path: '../.env' });

const { PORT } = getEnv();

if (process.env.NODE_ENV === 'production') {
  const root = path.resolve(__dirname, '../../../src/client/dist');

  express.static.mime.define({ 'text/css': ['css'] });

  app.use(express.static('public', { index: false }));

  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  // Hashed filenames — safe to cache forever. Avoids stale index + missing chunk after deploy.
  app.use(
    '/assets',
    express.static(path.join(root, 'assets'), {
      index: false,
      maxAge: '1y',
      immutable: true,
    })
  );

  app.use('/images', express.static(path.join(root, 'images'), { index: false }));

  // Serve specific files like robots.txt and icon.svg
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(root, 'robots.txt'));
  });

  app.get('/icon.svg', (req, res) => {
    res.type('image/svg+xml');
    res.sendFile(path.join(root, 'icon.svg'));
  });

  // Catch-all for non-asset routes, serving the SPA index.html
  app.get('*', (req, res, next) => {
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(root, 'index.html'));
    } else {
      next(); // Forward to a 404 handler for non-HTML requests
    }
  });

  // 404 Handler for other non-existent files
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });
}

app.listen(PORT, () => {
  console.log(`Listening: http://localhost:${PORT}`);
  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.DISABLE_TRIAL_ENDS_BACKFILL !== 'true'
  ) {
    void backfillMissingTenantTrialEndsAt().catch(err => {
      console.error('[startup] trialEndsAt backfill failed', err);
    });
  }
});
