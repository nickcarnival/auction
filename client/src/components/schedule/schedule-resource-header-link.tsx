import { Link } from 'react-router';
import { Resource } from '@shared/resource';
import { getClassName } from '../resources/colors';
import { cn } from '@/lib/utils';
import { TECHNICIANS_PATH, techniciansSettingsHref } from '@/lib/technician-settings-url';

/** Resource column title: color chip + link to technician settings. */
export function ScheduleResourceHeaderLink({ resource }: { resource: Resource }) {
  const colors = getClassName(resource.color);
  const to =
    resource._id != null && resource._id !== '' ? techniciansSettingsHref(resource._id) : TECHNICIANS_PATH;

  return (
    <Link
      to={to}
      className={cn(
        colors.background,
        colors.foreground,
        'schedule-resource-header block text-xs transition-opacity hover:opacity-90',
        'cursor-pointer underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {resource.name}
    </Link>
  );
}
