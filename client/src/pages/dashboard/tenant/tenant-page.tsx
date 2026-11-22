import { TenantForm } from './tenant-form';
import { TenantGrid } from './tenant-grid';

const TenantPage = () => {
  return (
    <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-2 md:px-6">
      <div className="mx-auto w-full min-w-0 max-w-none space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
        <TenantForm />
        <TenantGrid />
      </div>
    </div>
  );
};

export default TenantPage;
