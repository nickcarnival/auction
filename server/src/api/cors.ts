import { type CorsOptions, type CorsOptionsDelegate } from 'cors';

const allowedOrigins = [
  'http://localhost:5173',
  'https://saas-mi4a.onrender.com',
  'https://www.plandry.org',
];

const isOriginAllowed = (origin: string | undefined) => {
  if (!origin || allowedOrigins.includes(origin)) return true;

  const originDomain = new URL(origin).hostname.split('.');
  return allowedOrigins.some(x => {
    return x.includes(originDomain[1]);
  });
};

export const corsOptions: CorsOptions | CorsOptionsDelegate = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log('ORIGIN', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
