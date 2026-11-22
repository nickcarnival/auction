import { Router, type Request, type Response } from 'express';
import {
  assertManagerCanAccessUser,
  createUser,
  deleteUserById,
  getUserByIdIncludingInactive,
  getUsersByTenant,
  updateUserProfile,
  updateUserWorkspaceRole,
} from './user-service';
import { inviteUser } from './invite-service';
import type { User } from '@shared/user';
import { toTenantIdString } from '@shared/to-tenant-id-string';
import { APP_ROLE } from '@shared/app-rbac';
import { isGlobalTenantAdminRole } from '@shared/global-admin-role';
import { TENANT_ADMIN_ROLE } from '@shared/tenant-admin-role';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

router.post('/add-user', requireAppRole(APP_ROLE.TENANT_ADMIN), async (req: Request<{}, {}, { user: User }>, res: Response) => {
  try {
    const manager = req.ctx?.user;
    if (!manager?._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.body.user;
    if (!user) {
      return res.status(400).json({ error: 'User payload required' });
    }

    const payload: User = { ...user };
    if (!isGlobalTenantAdminRole(manager.role)) {
      payload.tenantId = toTenantIdString(manager.tenantId);
      payload.role = APP_ROLE.USER;
    } else if (!payload.tenantId?.length) {
      return res.status(400).json({ error: 'tenantId required' });
    }

    const insertedId = await createUser(payload);

    res.status(201).json({
      _id: insertedId.toHexString(),
      name: payload.name,
      email: payload.email,
      tenantId: payload.tenantId,
    });
  } catch (e) {
    console.error(e);
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: number }).code === 11000) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const message = e instanceof Error ? e.message : 'Failed to create user';
    return res.status(500).json({ error: message });
  }
});

router.post('/update-profile', requireAppRole(APP_ROLE.TENANT_ADMIN), async (req: Request, res: Response) => {
  try {
    const manager = req.ctx?.user;
    if (!manager?._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body as { _id?: string; name?: string; email?: string };
    if (!body._id || !body.name?.trim() || !body.email?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await assertManagerCanAccessUser(manager, body._id);
    const updated = await updateUserProfile(body._id, {
      name: body.name.trim(),
      email: body.email.trim(),
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (msg === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (msg === 'EMAIL_IN_USE') {
      return res.status(409).json({ error: 'Email already in use for this tenant' });
    }
    console.error(e);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/resend-invite', requireAppRole(APP_ROLE.TENANT_ADMIN), async (req: Request, res: Response) => {
  try {
    const manager = req.ctx?.user;
    if (!manager?._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.body as { userId?: string };
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const target = await assertManagerCanAccessUser(manager, userId);
    if (target.active) {
      return res.status(400).json({ error: 'User is already active' });
    }

    await inviteUser({ ...target, password: '' });
    res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (msg === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.error(e);
    return res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

router.get('/get-by-token', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  const user = req.ctx?.user;
  if (!user?._id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(user);
});

router.get('/get-by-tenant-id', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    if (!tenantId?.length) {
      return res.status(400).json({ error: 'tenantId required' });
    }

    const manager = req.ctx?.user;
    if (!manager?._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isGlobalTenantAdminRole(manager.role) && toTenantIdString(manager.tenantId) !== tenantId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await getUsersByTenant(tenantId);
    res.json(users);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load users' });
  }
});

/**
 * Global admin only: set workspace role (`tenant_admin` | `user`) for a user in a tenant.
 */
router.patch('/:id/workspace-role', requireAppRole(APP_ROLE.ADMIN), async (req: Request, res: Response) => {
  try {
    const admin = req.ctx?.user;
    if (!admin?._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetId = req.params.id;
    const body = req.body as { workspaceRole?: string; tenantId?: string };
    const tenantId = body.tenantId?.trim();
    if (!tenantId?.length) {
      return res.status(400).json({ error: 'tenantId required' });
    }
    if (body.workspaceRole !== TENANT_ADMIN_ROLE && body.workspaceRole !== APP_ROLE.USER) {
      return res.status(400).json({ error: 'workspaceRole must be tenant_admin or user' });
    }

    const target = await getUserByIdIncludingInactive(targetId);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (isGlobalTenantAdminRole(target.role)) {
      return res.status(400).json({ error: 'Cannot change platform admin role' });
    }
    if (toTenantIdString(target.tenantId) !== tenantId) {
      return res.status(403).json({ error: 'User is not in this tenant' });
    }

    const ok = await updateUserWorkspaceRole(targetId, body.workspaceRole);
    if (!ok) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/:id', requireAppRole(APP_ROLE.TENANT_ADMIN), async (req: Request, res: Response) => {
  try {
    const manager = req.ctx?.user;
    if (!manager?._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetId = req.params.id;
    if (targetId === manager._id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await assertManagerCanAccessUser(manager, targetId);
    const ok = await deleteUserById(targetId);
    if (!ok) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (msg === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.error(e);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
