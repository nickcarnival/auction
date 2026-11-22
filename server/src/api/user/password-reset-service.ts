import { getDb } from '@/db';
import { EMAIL_TEMPLATES, sendEmail } from '@/email/email-service';
import { getClientAppOrigin } from '@/utils/client-app-origin';
import { validateEmail } from '@/utils/validation';
import { createHash } from '@/api/auth/hashing';
import { generateOpaqueToken, hashOpaqueToken } from '@/api/auth/opaque-token';
import { ObjectId } from 'mongodb';

const COLLECTION = 'password_resets';
const TTL_MS = 1000 * 60 * 60; // 1 hour

const GENERIC_FORGOT_RESPONSE =
  'If an account exists for that email, we sent a link to reset your password.';

export function getForgotPasswordResponseMessage(): string {
  return GENERIC_FORGOT_RESPONSE;
}

/**
 * Creates a one-time reset row and emails the raw token link. Always swallow errors after logging;
 * callers should return a generic success message to avoid account enumeration.
 */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const ev = validateEmail(emailRaw);
  if (!ev.valid) {
    return;
  }
  const email = emailRaw.toLowerCase().trim();

  const db = await getDb();
  const userDoc = await db.collection('user').findOne({
    email,
    active: true,
  });

  if (!userDoc?._id) {
    return;
  }

  const userId = userDoc._id as ObjectId;

  await db.collection(COLLECTION).deleteMany({ userId });

  const raw = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(raw);
  const now = new Date();

  await db.collection(COLLECTION).insertOne({
    userId,
    tokenHash,
    expiresAt: new Date(now.getTime() + TTL_MS),
    createdAt: now,
  });

  const origin = getClientAppOrigin();
  const url = `${origin}/reset-password?token=${encodeURIComponent(raw)}`;

  await sendEmail({
    from: 'Plandry <invites@plandry.org>',
    to: [email],
    subject: 'Reset your Plandry password',
    html: EMAIL_TEMPLATES.passwordReset(url),
  });
}

export async function verifyPasswordResetTokenLooksValid(rawToken: string): Promise<boolean> {
  const trimmed = rawToken?.trim();
  if (!trimmed.length) return false;

  const db = await getDb();
  const tokenHash = hashOpaqueToken(trimmed);
  const doc = await db.collection(COLLECTION).findOne({ tokenHash });
  if (!doc?.expiresAt) return false;
  return doc.expiresAt > new Date();
}

/**
 * @returns `ok`, or an error code for the API layer to map to HTTP status
 */
export async function completePasswordReset(
  rawToken: string,
  newPassword: string
): Promise<'ok' | 'invalid_or_expired'> {
  const trimmed = rawToken?.trim();
  if (!trimmed.length) return 'invalid_or_expired';

  const db = await getDb();
  const tokenHash = hashOpaqueToken(trimmed);
  const doc = await db.collection(COLLECTION).findOne({ tokenHash });

  if (!doc?.userId || !doc.expiresAt) {
    return 'invalid_or_expired';
  }
  if (doc.expiresAt <= new Date()) {
    await db.collection(COLLECTION).deleteOne({ tokenHash });
    return 'invalid_or_expired';
  }

  const userId = doc.userId as ObjectId;
  const userDoc = await db.collection('user').findOne({ _id: userId, active: true });
  if (!userDoc) {
    await db.collection(COLLECTION).deleteOne({ tokenHash });
    return 'invalid_or_expired';
  }

  const hashedPassword = await createHash(newPassword);
  await db.collection('user').updateOne(
    { _id: userId },
    {
      $set: {
        password: hashedPassword,
        failedAttempts: 0,
        updatedDate: new Date().toLocaleDateString(),
      },
    }
  );

  await db.collection(COLLECTION).deleteMany({ userId });

  return 'ok';
}

export async function deletePasswordResetsForUserIds(userIds: ObjectId[]): Promise<void> {
  if (!userIds.length) return;
  const db = await getDb();
  await db.collection(COLLECTION).deleteMany({ userId: { $in: userIds } });
}
