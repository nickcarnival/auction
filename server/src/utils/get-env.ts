type Env = {
  PORT: number;
  JWT_SECRET: string;
  DB_URL: string;
  // CAPTCHA_SITE_KEY: string,
  CAPTCHA_SECRET: string;
  RESEND_API: string;
};

const logAndQuit = (message: string) => {
  console.error(`Missing environment variables: ${message}`);
  process.exit(1);
};

export const getEnv = (): Env => {
  const {
    PORT,
    JWT_SECRET,
    DB_URL,
    // CAPTCHA_SITE_KEY,
    RESEND_API,
    CAPTCHA_SECRET,
  } = process.env;

  if (!PORT) return logAndQuit('PORT');
  if (!JWT_SECRET) return logAndQuit('JWT_SECRET');
  if (!DB_URL) return logAndQuit('DB_URL');
  // if (!CAPTCHA_SITE_KEY) return logAndQuit('CAPTCHA_SITE_KEY');
  if (!CAPTCHA_SECRET) return logAndQuit('CAPTCHA_SECRET');
  if (!RESEND_API) return logAndQuit('RESEND_API');

  return {
    PORT: parseInt(PORT),
    JWT_SECRET,
    RESEND_API,
    DB_URL,
    // CAPTCHA_SITE_KEY,
    CAPTCHA_SECRET,
  };
};
