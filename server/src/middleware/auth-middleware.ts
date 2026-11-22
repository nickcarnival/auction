import { ApiError } from '@/errors/api-error';
import { getEnv } from '@/utils/get-env';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getUserByToken } from '../api/user/user-service';
import type { UserAndTenant } from '@shared/user';
import { isGlobalTenantAdminRole } from '@shared/global-admin-role';
import { toTenantIdString } from '@shared/to-tenant-id-string';

export const authenticateMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const { JWT_SECRET } = getEnv();

  const token = req.cookies['auth-token'];

  if (!token) {
    return res
      .status(401)
      .json(
        ApiError.unauthorized('AUTH_REQUIRED', 'Authentication required').toJSON()
      );
  }

  try {
    jwt.verify(token, JWT_SECRET);

    const user = await getUserByToken(token);

    if (!user) {
      res.clearCookie('auth-token');
      return res
        .status(401)
        .json(
          ApiError.unauthorized(
            'AUTH_SESSION_INVALID',
            'Session is no longer valid'
          ).toJSON()
        );
    }

    const u = user as UserAndTenant;
    const tenantId = toTenantIdString(u.tenantId).trim();
    if (!tenantId || !ObjectId.isValid(tenantId)) {
      res.clearCookie('auth-token');
      return res
        .status(401)
        .json(
          ApiError.unauthorized(
            'AUTH_SESSION_INVALID',
            'Session is no longer valid'
          ).toJSON()
        );
    }

    req.ctx = {
      user: u,
      tenant: u.tenant,
      tenantId,
      isGlobalAdmin: isGlobalTenantAdminRole(u.role),
    };

    next();
  } catch {
    res.clearCookie('auth-token');
    res
      .status(403)
      .json(
        ApiError.forbidden('AUTH_TOKEN_INVALID', 'Invalid or expired token').toJSON()
      );
  }
};
