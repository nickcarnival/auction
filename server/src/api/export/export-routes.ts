import { Router, type Request, type Response } from 'express';
import { csvLine } from '@/utils/csv-row';
import { scheduleRecordUserEvent } from '@/api/analytics/record-request-event';
import { getCustomersForCsvExport } from '../customer/customer-service';
import { getAppointmentsForCsvExport } from '../appointment/appointment-service';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

function exportFileName(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${prefix}-${y}-${m}-${day}.csv`;
}

function requireTenant(req: Request, res: Response): string | null {
  const tenantId = req.ctx?.tenantId?.trim();
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return tenantId;
}

/** UTF-8 BOM so Excel recognizes UTF-8 exports. */
const CSV_BOM = '\uFEFF';

router.get('/customers.csv', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const rows = await getCustomersForCsvExport(tenantId);
    const header = csvLine(['id', 'name', 'email', 'phone', 'createdDate', 'updatedDate']);
    const body = rows.map(r =>
      csvLine([
        r._id ?? '',
        r.name ?? '',
        r.email ?? '',
        r.phone ?? '',
        r.createdDate ?? '',
        r.updatedDate ?? '',
      ])
    );
    const csv = [header, ...body].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportFileName('plandry-customers')}"`
    );
    scheduleRecordUserEvent(req, 'export.customers_csv', { category: 'customers' });
    res.send(CSV_BOM + csv);
  } catch (e) {
    console.error('[export] customers.csv', e);
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/appointments.csv', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const rows = await getAppointmentsForCsvExport(tenantId);
    const header = csvLine([
      'id',
      'customer',
      'customerId',
      'start',
      'end',
      'duration',
      'status',
      'service',
      'vehicle',
      'phone',
      'email',
      'notes',
      'resourceId',
      'checkedIn',
      'isConfirmed',
    ]);
    const body = rows.map(r =>
      csvLine([
        r.id,
        r.customer,
        r.customerId,
        r.start,
        r.end,
        r.duration,
        r.status,
        r.service,
        r.vehicle,
        r.phone,
        r.email,
        r.notes,
        r.resourceId,
        r.checkedIn,
        r.isConfirmed,
      ])
    );
    const csv = [header, ...body].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportFileName('plandry-appointments')}"`
    );
    scheduleRecordUserEvent(req, 'export.appointments_csv', { category: 'appointments' });
    res.send(CSV_BOM + csv);
  } catch (e) {
    console.error('[export] appointments.csv', e);
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
