import { type Resource, sortResourcesByOrder } from '@shared/resource';

export function sortTechniciansForNav(resources: Resource[]): (Resource & { _id: string })[] {
  const withId = resources.filter(
    (r): r is Resource & { _id: string } => typeof r._id === 'string' && r._id !== ''
  );
  return sortResourcesByOrder(withId) as (Resource & { _id: string })[];
}
