import { getDb } from '@/db';
import jwt from 'jsonwebtoken';
import { getEnv } from '@/utils/get-env';
import type { User, UserAndTenant } from '@shared/user';
import { isGlobalTenantAdminRole } from '@shared/global-admin-role';
import { TENANT_ADMIN_ROLE } from '@shared/tenant-admin-role';
import { toTenantIdString } from '@shared/to-tenant-id-string';
import { ObjectId } from 'mongodb';
import { inviteUser } from './invite-service';
import { deletePasswordResetsForUserIds } from './password-reset-service';

const COLLECTION = 'user';

/** User docs store `createdDate`; some legacy rows use `created`. */
function serializeUserCreated(doc: Record<string, unknown>): string | undefined {
  if (doc.createdDate != null) return String(doc.createdDate);
  if (doc.created != null) return String(doc.created);
  return undefined;
}

export const serializeUserDocument = (
  doc: Record<string, unknown> | null | undefined
): User | null => {
  if (!doc?._id) return null;
  const rawId = doc._id as ObjectId | string;
  const _id = typeof rawId === 'string' ? rawId : rawId.toHexString();
  return {
    _id,
    name: String(doc.name ?? ''),
    email: String(doc.email ?? ''),
    password: '',
    tenantId: toTenantIdString(doc.tenantId),
    phone: doc.phone != null ? String(doc.phone) : undefined,
    role: doc.role != null ? String(doc.role) : undefined,
    active: doc.active === true,
    failedAttempts: typeof doc.failedAttempts === 'number' ? doc.failedAttempts : undefined,
    lastLogin: doc.lastLogin != null ? String(doc.lastLogin) : undefined,
    lastActive: doc.lastActive != null ? String(doc.lastActive) : undefined,
    created: serializeUserCreated(doc),
    updated: doc.updatedDate != null ? String(doc.updatedDate) : undefined,
  };
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalized = email.toLowerCase().trim();
  if (!normalized.length) return null;

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const doc = await collection.findOne({ email: normalized, active: true });

  const user: User | null = doc as User | null;
  return user;
};

/**
 * Persists only known user fields (no raw document spread — avoids invalid $set / leaked keys).
 */
export const updateUser = async (user: User): Promise<User | null> => {
  if (user._id == null || String(user._id).length === 0) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const $set: Record<string, unknown> = {
    updatedDate: new Date().toLocaleDateString(),
  };

  const setIfDefined = (key: string, value: unknown) => {
    if (value !== undefined) {
      $set[key] = value;
    }
  };

  setIfDefined('name', user.name);
  setIfDefined('email', user.email);
  setIfDefined('password', user.password);
  setIfDefined('active', user.active);
  setIfDefined('failedAttempts', user.failedAttempts);
  setIfDefined('phone', user.phone);
  setIfDefined('role', user.role);
  setIfDefined('lastLogin', user.lastLogin);
  setIfDefined('lastActive', user.lastActive);

  await collection.updateOne({ _id: new ObjectId(String(user._id)) }, { $set });

  return { ...user, _id: String(user._id) };
};

export const getUserById = async (_id: string): Promise<User | null> => {
  if (!_id.length) return null;

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const doc = await collection.findOne({
    _id: new ObjectId(_id),
    active: true,
  });

  const user: User | null = doc as User | null;
  return user;
};

/** Loads a user by id regardless of `active` (e.g. admin workspace-role updates). */
export const getUserByIdIncludingInactive = async (_id: string): Promise<User | null> => {
  if (!_id.length) return null;

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const doc = await collection.findOne({ _id: new ObjectId(_id) });
  return serializeUserDocument(doc as Record<string, unknown> | null);
};

export const getUsersByTenant = async (tenantId: string): Promise<User[]> => {
  const db = await getDb();
  const userCollection = db.collection(COLLECTION);

  const docs = await userCollection
    .find({
      tenantId: new ObjectId(tenantId),
    })
    .toArray();

  return docs
    .map(d => serializeUserDocument(d as Record<string, unknown>))
    .filter((u): u is User => u != null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
};

/**
 * Ensures the manager may act on the target user (same tenant, or global admin).
 */
export const assertManagerCanAccessUser = async (
  manager: { tenantId: unknown; role?: string | null },
  targetUserId: string
): Promise<User> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const doc = await collection.findOne({ _id: new ObjectId(targetUserId) });
  const target = serializeUserDocument(doc as Record<string, unknown> | null);
  if (!target) {
    throw new Error('USER_NOT_FOUND');
  }
  const managerTenant = toTenantIdString(manager.tenantId);
  if (!isGlobalTenantAdminRole(manager.role) && managerTenant !== target.tenantId) {
    throw new Error('FORBIDDEN');
  }
  return target;
};

export const updateUserProfile = async (
  userId: string,
  updates: { name: string; email: string }
): Promise<User | null> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const oid = new ObjectId(userId);
  const existing = await collection.findOne({ _id: oid });
  if (!existing) return null;

  const tenantOid =
    existing.tenantId instanceof ObjectId
      ? existing.tenantId
      : new ObjectId(String(existing.tenantId));

  const nextEmail = updates.email.trim().toLowerCase();

  const emailTaken = await collection.findOne({
    tenantId: tenantOid,
    email: nextEmail,
    _id: { $ne: oid },
  });
  if (emailTaken) {
    throw new Error('EMAIL_IN_USE');
  }

  const prevEmail = String(existing.email ?? '').toLowerCase();
  if (prevEmail !== nextEmail) {
    await db.collection('invites').deleteMany({ email: prevEmail });
  }

  await collection.updateOne(
    { _id: oid },
    {
      $set: {
        name: updates.name,
        email: nextEmail,
        updatedDate: new Date().toLocaleDateString(),
      },
    }
  );

  const next = await collection.findOne({ _id: oid });
  return serializeUserDocument(next as Record<string, unknown> | null);
};

/**
 * Sets tenant workspace role (`tenant_admin` or `user`). Does not set platform `admin`.
 */
export const updateUserWorkspaceRole = async (
  userId: string,
  workspaceRole: typeof TENANT_ADMIN_ROLE | 'user'
): Promise<boolean> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const oid = new ObjectId(userId);
  const role = workspaceRole === TENANT_ADMIN_ROLE ? TENANT_ADMIN_ROLE : 'user';
  const result = await collection.updateOne(
    { _id: oid },
    { $set: { role, updatedDate: new Date().toLocaleDateString() } }
  );
  return result.modifiedCount === 1;
};

export const deleteUserById = async (userId: string): Promise<boolean> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const oid = new ObjectId(userId);
  const doc = await collection.findOne({ _id: oid });
  if (!doc) return false;

  const email = String(doc.email ?? '').toLowerCase();
  await deletePasswordResetsForUserIds([oid]);
  await db.collection('invites').deleteMany({ email });
  const result = await collection.deleteOne({ _id: oid });
  return result.deletedCount === 1;
};

export const getUserByToken = async (token: string): Promise<UserAndTenant | null> => {
  if (!token.length) return null;

  const { JWT_SECRET } = getEnv();

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const decoded = jwt.verify(token, JWT_SECRET) as { _id?: string };

  if (!decoded._id) {
    return null;
  }

  await db
    .collection('user')
    .updateOne(
      { _id: new ObjectId(decoded._id) },
      { $set: { lastActive: new Date().toLocaleDateString() } }
    );

  const doc = await collection
    .aggregate([
      {
        $match: { _id: new ObjectId(decoded._id), active: true },
      },
      {
        $lookup: {
          from: 'tenant',
          localField: 'tenantId',
          foreignField: '_id',
          as: 'tenant',
        },
      },
      { $unwind: { path: '$tenant' } },
      {
        // Only return users whose tenant is also active (approved)
        $match: { 'tenant.active': true },
      },
    ])
    .toArray();

  const user: UserAndTenant | null = doc[0] as UserAndTenant;

  return user;
};

export const createUser = async (user: User): Promise<ObjectId> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const doc: Record<string, unknown> = {
    name: String(user.name ?? '').trim(),
    email: String(user.email ?? '')
      .trim()
      .toLowerCase(),
    tenantId: new ObjectId(user.tenantId),
    password: typeof user.password === 'string' ? user.password : '',
    active: false,
    failedAttempts: 0,
    createdDate: new Date().toLocaleDateString(),
    updatedDate: new Date().toLocaleDateString(),
  };

  if (user.phone != null && String(user.phone).length > 0) {
    doc.phone = user.phone;
  }
  if (user.role != null && String(user.role).length > 0) {
    doc.role = user.role;
  }

  const newUser = await collection.insertOne(doc);

  await inviteUser({
    name: doc.name as string,
    email: doc.email as string,
    password: '',
    tenantId: user.tenantId,
  } as User);

  return newUser.insertedId;
};
