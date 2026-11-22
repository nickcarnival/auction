import type { Request } from 'express';
import type { UserEventMetadata } from '@shared/schemas/user-event-schema';
import { recordUserEvent } from './analytics-service';

function bodyFromAction(
  action: string,
  metadata?: UserEventMetadata
): { action: string; metadata?: UserEventMetadata } {
  const hasMeta =
    metadata !== undefined &&
    Object.keys(metadata).length > 0 &&
    Object.values(metadata).some(v => v !== undefined);
  return {
    action,
    ...(hasMeta ? { metadata } : {}),
  };
}

/**
 * Fire-and-forget row when you already have `tenantId` / `userId` (e.g. auth before `req.ctx` exists).
 */
export function scheduleRecordUserEventByIds(
  tenantId: string,
  userId: string,
  action: string,
  metadata?: UserEventMetadata
): void {
  if (!tenantId || userId === undefined || userId === '') return;
  void recordUserEvent(tenantId, String(userId), bodyFromAction(action, metadata)).catch(
    (err: unknown) => {
      console.error('[analytics] scheduleRecordUserEventByIds', action, err);
    }
  );
}

/**
 * Fire-and-forget user activity row from an authenticated request (`req.ctx`).
 * Failures are logged only; they must not affect the handler response.
 */
export function scheduleRecordUserEvent(
  req: Request,
  action: string,
  metadata?: UserEventMetadata
): void {
  const tenantId = req.ctx?.tenantId;
  const userId = req.ctx?.user._id;
  if (!tenantId || userId === undefined || userId === '') return;

  void recordUserEvent(tenantId, String(userId), bodyFromAction(action, metadata)).catch(
    (err: unknown) => {
      console.error('[analytics] scheduleRecordUserEvent', action, err);
    }
  );
}
