import { ApiError } from '@/errors/api-error';
import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getUserByEmail, getUserByToken, updateUser } from '../user/user-service';
import {
  deleteInviteByRawToken,
  getInviteByToken,
  tryGetInviteByToken,
} from '../user/invite-service';
import {
  completePasswordReset,
  getForgotPasswordResponseMessage,
  requestPasswordReset,
  verifyPasswordResetTokenLooksValid,
} from '../user/password-reset-service';
import { getEnv } from '@/utils/get-env';
import { compareHash, createHash } from './hashing';
import { getDb } from '@/db';
import type { User } from '@shared/user';
import {
  loginRateLimit,
  passwordForgotRateLimit,
  passwordResetSubmitRateLimit,
} from '../../middleware/rate-limit-middleware';
import { validateEmail, validatePassword } from '../../utils/validation';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';
import { toTenantIdString } from '@shared/to-tenant-id-string';
import { scheduleRecordUserEventByIds } from '@/api/analytics/record-request-event';

const router = Router();

router.use('/login', loginRateLimit);
router.use('/forgot-password', passwordForgotRateLimit);
router.use('/reset-password', passwordResetSubmitRateLimit);
router.use('/verify-reset-token', passwordResetSubmitRateLimit);

/** Clears session cookie; records `auth.logout` when the session was valid. */
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.['auth-token'];
  if (typeof token === 'string' && token.length > 0) {
    try {
      const user = await getUserByToken(token);
      if (user) {
        const tid = toTenantIdString(user.tenantId);
        const uid = user._id;
        if (tid && uid !== undefined && uid !== '') {
          scheduleRecordUserEventByIds(tid, String(uid), 'auth.logout', { category: 'auth' });
        }
      }
    } catch {
      /* still clear cookie */
    }
  }
  clearAuthCookie(res);
  res.status(204).send();
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { JWT_SECRET } = getEnv();

    if (!email || !password) {
      return res
        .status(400)
        .json(
          ApiError.badRequest('LOGIN_FIELDS_REQUIRED', 'Email and password are required').toJSON()
        );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res
        .status(400)
        .json(ApiError.badRequest('INVALID_EMAIL', 'Invalid email format').toJSON());
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(normalizedEmail);

    if ((user?.failedAttempts ?? 0) >= 5) {
      return res
        .status(401)
        .json(ApiError.unauthorized('ACCOUNT_LOCKED', 'Account locked').toJSON());
    }

    if (!user) {
      return res
        .status(401)
        .json(ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials').toJSON());
    }

    if (!user.active) {
      return res.status(401).json(
        ApiError.unauthorized(
          'ACCOUNT_NOT_VERIFIED',
          'Account not verified. Please check your email for verification instructions.'
        ).toJSON()
      );
    }

    if (!compareHash(password, user.password)) {
      const db = await getDb();
      await db.collection('user').updateOne(
        { _id: new ObjectId(String(user._id)) },
        { $inc: { failedAttempts: 1 } }
      );
      return res
        .status(401)
        .json(ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid credentials').toJSON());
    }

    const token = jwt.sign({ _id: user._id, name: user.name, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    setAuthCookie(res, token);
    await updateUser({
      ...user,
      failedAttempts: 0,
      password: user.password,
    });

    const userWithTenant = await getUserByToken(token);
    if (userWithTenant) {
      const tid = toTenantIdString(userWithTenant.tenantId);
      const uid = userWithTenant._id;
      if (tid && uid !== undefined && uid !== '') {
        scheduleRecordUserEventByIds(tid, String(uid), 'auth.login', { category: 'auth' });
      }
    }

    res.json({ token, user: userWithTenant });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json(ApiError.internal('Something went wrong. Try again.').toJSON());
  }
});

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, token } = req.body as {
      email?: string;
      password?: string;
      token?: string;
    };

    const { JWT_SECRET } = getEnv();

    if (!email?.trim() || !password || !token?.trim()) {
      return res
        .status(400)
        .json(
          ApiError.badRequest(
            'SIGNUP_FIELDS_REQUIRED',
            'Email, password, and invitation are required'
          ).toJSON()
        );
    }

    const pw = validatePassword(password);
    if (!pw.valid) {
      return res.status(400).json(
        ApiError.badRequest('INVALID_PASSWORD', pw.error ?? 'Invalid password').toJSON()
      );
    }

    let invite;
    try {
      invite = await getInviteByToken(token);
    } catch {
      return res
        .status(404)
        .json(ApiError.notFound('INVITE_NOT_FOUND', 'Invite not found or expired').toJSON());
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== invite.email.toLowerCase()) {
      return res
        .status(404)
        .json(ApiError.notFound('INVITE_NOT_FOUND', 'Invite not found or expired').toJSON());
    }

    const db = await getDb();

    const doc = await db.collection('user').findOne({ email: normalizedEmail });

    const user: User | null = doc as User | null;

    if (!user || (user?.failedAttempts ?? 0) >= 5) {
      return res
        .status(404)
        .json(ApiError.notFound('INVITE_NOT_FOUND', 'Invite not found or expired').toJSON());
    }

    const hashedPassword = await createHash(password);

    await updateUser({
      ...user,
      failedAttempts: 0,
      active: true,
      password: hashedPassword,
    });

    await deleteInviteByRawToken(token);

    const jot = jwt.sign({ _id: user._id, name: user.name, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    setAuthCookie(res, jot);

    const userWithTenant = await getUserByToken(jot);
    if (!userWithTenant) {
      return res
        .status(500)
        .json(ApiError.internal('Account setup failed').toJSON());
    }

    const tidSignup = toTenantIdString(userWithTenant.tenantId);
    const uidSignup = userWithTenant._id;
    if (tidSignup && uidSignup !== undefined && uidSignup !== '') {
      scheduleRecordUserEventByIds(tidSignup, String(uidSignup), 'auth.signup_complete', {
        category: 'auth',
      });
    }

    res.json({ token: jot, user: userWithTenant });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json(ApiError.internal('Something went wrong. Try again.').toJSON());
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const ev = validateEmail(email);
    if (!ev.valid) {
      return res.status(400).json(
        ApiError.badRequest('INVALID_EMAIL', ev.error ?? 'Invalid email').toJSON()
      );
    }

    try {
      await requestPasswordReset(email);
    } catch (err) {
      console.error('[auth] forgot-password mail', err);
    }

    return res.status(200).json({ message: getForgotPasswordResponseMessage() });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json(ApiError.internal('Something went wrong. Try again.').toJSON());
  }
});

router.get('/verify-reset-token', async (req: Request, res: Response) => {
  const raw = req.query.token;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({
      ok: false,
      ...ApiError.badRequest('RESET_TOKEN_REQUIRED', 'token query is required').toJSON(),
    });
  }
  const ok = await verifyPasswordResetTokenLooksValid(raw);
  return res.status(ok ? 200 : 404).json({
    ok,
    ...(!ok
      ? ApiError.notFound('RESET_TOKEN_INVALID', 'Reset link is invalid or expired').toJSON()
      : {}),
  });
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const pw = validatePassword(password);
    if (!pw.valid) {
      return res.status(400).json(
        ApiError.badRequest('INVALID_PASSWORD', pw.error ?? 'Invalid password').toJSON()
      );
    }

    const result = await completePasswordReset(token, password);
    if (result === 'invalid_or_expired') {
      return res
        .status(404)
        .json(
          ApiError.notFound('RESET_TOKEN_INVALID', 'Reset link is invalid or expired').toJSON()
        );
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json(ApiError.internal('Something went wrong. Try again.').toJSON());
  }
});

router.get('/prefill-signup', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res
      .status(404)
      .json(ApiError.notFound('INVITE_NOT_FOUND', 'Invite not found or expired').toJSON());
  }

  const invite = await tryGetInviteByToken(token);

  if (!invite || invite.expiresAt < new Date() || !invite.tenant) {
    return res
      .status(404)
      .json(ApiError.notFound('INVITE_NOT_FOUND', 'Invite not found or expired').toJSON());
  }

  res.status(200).json({ invite });
});

export default router;
