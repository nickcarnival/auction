import { getTenantById } from '../tenant/tenant-service';
import { getDb } from '@/db';
import { EMAIL_TEMPLATES, sendEmail } from '@/email/email-service';
import { getClientAppOrigin } from '@/utils/client-app-origin';
import { inviteSchema, type Invite } from '@shared/invite';
import { tenantSchema } from '@shared/tenant';
import type { User } from '@shared/user';
import * as z from 'zod';
import { ObjectId } from 'mongodb';
import { generateOpaqueToken, hashOpaqueToken } from '../auth/opaque-token';

/** `tenant._id` from Mongo may still be BSON `ObjectId`; shared `tenantSchema` expects string hex. */
const tenantIdFromInviteMongo = z
  .union([z.instanceof(ObjectId), z.string()])
  .transform(v => (v instanceof ObjectId ? v.toHexString() : v));

const tenantOnInviteRow = tenantSchema.extend({
  _id: tenantIdFromInviteMongo.optional(),
});

const inviteFromMongoRowSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1).optional(),
  tokenHash: z.string().min(1).optional(),
  expiresAt: z.coerce.date(),
  tenant: tenantOnInviteRow,
});

function mongoRowToInvite(data: z.infer<typeof inviteFromMongoRowSchema>): Invite {
  return inviteSchema.parse({
    email: data.email,
    expiresAt: data.expiresAt,
    tenant: data.tenant,
  });
}

async function findInviteDocByRawToken(db: Awaited<ReturnType<typeof getDb>>, rawToken: string) {
  const trimmed = rawToken.trim();
  if (!trimmed.length) return null;

  const hashed = hashOpaqueToken(trimmed);
  const byHash = await db.collection('invites').findOne({ tokenHash: hashed });
  if (byHash) return byHash;

  return db.collection('invites').findOne({ token: trimmed });
}

export const inviteUser = async (user: User): Promise<void> => {
  const db = await getDb();

  const tenant = await getTenantById(user.tenantId);

  if (!tenant?.name) {
    throw new Error('No tenant found cannot send invite');
  }

  const email = user.email.toLowerCase().trim();
  const raw = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(raw);

  await db.collection('invites').insertOne({
    email,
    tokenHash,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdDate: new Date().toLocaleDateString(),
    tenant,
  });

  const origin = getClientAppOrigin();
  const url = `${origin}/signup?token=${encodeURIComponent(raw)}`;

  await sendEmail({
    from: 'Plandry <invites@plandry.org>',
    to: [email],
    subject: 'Verify your email address - Plandry',
    html: EMAIL_TEMPLATES.invite(tenant?.name, url),
  });
};

export const getInviteByToken = async (rawToken: string): Promise<Invite> => {
  const db = await getDb();
  const doc = await findInviteDocByRawToken(db, rawToken);

  if (!doc) {
    throw new Error('Invalid or expired invite.');
  }

  const mongoParsed = inviteFromMongoRowSchema.safeParse(doc);
  if (!mongoParsed.success) {
    throw new Error('Invalid or expired invite.');
  }

  const invite = mongoRowToInvite(mongoParsed.data);

  if (invite.expiresAt < new Date()) {
    const trimmed = rawToken.trim();
    const hashed = hashOpaqueToken(trimmed);
    await db.collection('invites').deleteMany({
      $or: [{ tokenHash: hashed }, { token: trimmed }],
    });
    throw new Error('Invalid or expired invite.');
  }

  return invite;
};

/** HTTP handlers: never throw—return null for 404-style responses. */
export const tryGetInviteByToken = async (rawToken: string): Promise<Invite | null> => {
  try {
    return await getInviteByToken(rawToken);
  } catch {
    return null;
  }
};

export async function deleteInviteByRawToken(rawToken: string): Promise<void> {
  const db = await getDb();
  const trimmed = rawToken.trim();
  if (!trimmed.length) return;
  const hashed = hashOpaqueToken(trimmed);
  await db.collection('invites').deleteMany({
    $or: [{ tokenHash: hashed }, { token: trimmed }],
  });
}
