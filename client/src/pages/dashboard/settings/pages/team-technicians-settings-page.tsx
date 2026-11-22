import { Navigate, useSearchParams } from 'react-router';
import {
  TECHNICIAN_ID_SEARCH_PARAM,
  TECHNICIANS_PATH,
  technicianDetailPath,
} from '@/lib/technician-settings-url';

/** Legacy path: `/dashboard/settings/team/technicians` → technicians (preserves `technicianId` as a path segment). */
export default function TeamTechniciansSettingsPage() {
  const [params] = useSearchParams();
  const id = params.get(TECHNICIAN_ID_SEARCH_PARAM);
  const qs = params.toString();

  if (id) {
    const rest = new URLSearchParams(params);
    rest.delete(TECHNICIAN_ID_SEARCH_PARAM);
    const tail = rest.toString();
    return (
      <Navigate
        to={tail ? `${technicianDetailPath(id)}?${tail}` : technicianDetailPath(id)}
        replace
      />
    );
  }

  return <Navigate to={qs ? `${TECHNICIANS_PATH}?${qs}` : TECHNICIANS_PATH} replace />;
}
