import { CustomerGrid } from '@/components/customers/customer-grid';

export default function CustomersPage() {
  return (
    <div className="mt-1 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden px-2 sm:px-3">
      <CustomerGrid />
    </div>
  );
}
