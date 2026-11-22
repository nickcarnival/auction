import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import api from './api/api-routes';
import stripeWebhookRoute from './api/stripe/stripe-webhook-route';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { corsOptions } from './api/cors';
import { comprehensiveBotProtection } from './middleware/comprehensive-bot-protection';
import { securityHeaders, sanitizeBody } from './middleware/security-middleware';
import { errorHandler } from './middleware/error-handler';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  /** Looser limit in dev for local clicking; production tuned for abuse protection. */
  limit: process.env.NODE_ENV === 'production' ? 350 : 9000,
  standardHeaders: 'draft-8',
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  skip: req => req.originalUrl.startsWith('/api/stripe/webhook'),
});

const app = express();

app.use(comprehensiveBotProtection);
app.use(securityHeaders);

app.use(morgan(':remote-addr :method :url :status'));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://www.plandry.org'],
        scriptSrc: ["'self'", 'https://www.google.com', 'https://www.gstatic.com'],
        frameSrc: ["'self'", 'https://www.google.com'], // Allow reCAPTCHA iframe
      },
    },
  })
);
app.use(cors(corsOptions));
app.use(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookRoute
);
app.use(express.json());
app.use(sanitizeBody);
app.use(cookieParser());
// Apply the rate limiting middleware to all requests.
app.use(limiter);

app.use('/api/', api);

// Error handling middleware should be last
app.use(errorHandler);

export default app;
