import { useCustomerContext } from '../customers/customer-context';
import { HookFormType, type AppointmentSchemaType } from '@shared/schemas/appointment-schema';
import type { BookingSchemaType } from '@shared/schemas/booking-schema';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { normalizeCustomerNameWhileTyping } from '@shared/customer-name-utils';
import type { UseFormReturn, FieldError } from 'react-hook-form';

type AppointmentCustomerFieldProps = HookFormType & {
  onFieldHighlight: (fieldName: string) => void;
  onNavigateToCustomerProfile?: () => void;
  nameFormField?: 'customer' | 'name';
  inputId?: string;
  /** Extra classes on the outer wrapper (e.g. dialog: tighter vertical rhythm). */
  className?: string;
};

type BookingNameCustomerFieldProps = {
  form: UseFormReturn<BookingSchemaType>;
  nameFormField: 'name';
  onFieldHighlight: (fieldName: string) => void;
  onNavigateToCustomerProfile?: () => void;
  inputId?: string;
  className?: string;
};

export type CustomerFieldProps = AppointmentCustomerFieldProps | BookingNameCustomerFieldProps;

export const CustomerField = (props: CustomerFieldProps) => {
  if (props.nameFormField === 'name') {
    return <CustomerFieldInner {...props} nameFormField="name" />;
  }
  return <CustomerFieldInner {...props} nameFormField="customer" />;
};

type CustomerFieldInnerProps = {
  form: UseFormReturn<AppointmentSchemaType> | UseFormReturn<BookingSchemaType>;
  nameFormField: 'customer' | 'name';
  onFieldHighlight: (fieldName: string) => void;
  onNavigateToCustomerProfile?: () => void;
  inputId?: string;
  className?: string;
};

function CustomerFieldInner({
  form,
  nameFormField,
  onFieldHighlight,
  onNavigateToCustomerProfile,
  inputId: inputIdProp,
  className: classNameProp,
}: CustomerFieldInnerProps) {
  const { customers, isLoadingCustomers, isFetchingCustomers, searchCustomers } =
    useCustomerContext();
  const customerId = form.watch('customerId');
  const isBookingName = nameFormField === 'name';

  const watchedName = isBookingName
    ? (form.watch('name') as string | undefined)
    : (form.watch('customer') as string | undefined);
  const [search, setSearch] = useState(() => String(watchedName ?? ''));
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const setName = useCallback(
    (value: string) => {
      if (isBookingName) {
        (form as UseFormReturn<BookingSchemaType>).setValue('name', value);
      } else {
        (form as UseFormReturn<AppointmentSchemaType>).setValue('customer', value);
      }
    },
    [form, isBookingName]
  );

  const nameError: FieldError | undefined = isBookingName
    ? (form.formState.errors.name as FieldError | undefined)
    : (form.formState.errors.customer as FieldError | undefined);

  useEffect(() => {
    if (debouncedSearch) {
      searchCustomers(debouncedSearch);
    }
  }, [debouncedSearch, searchCustomers]);

  useEffect(() => {
    if (watchedName != null && typeof watchedName === 'string') {
      setSearch(watchedName);
    }
  }, [watchedName]);

  useEffect(() => {
    const v = isBookingName
      ? (form as UseFormReturn<BookingSchemaType>).getValues('name')
      : (form as UseFormReturn<AppointmentSchemaType>).getValues('customer');
    if (v && typeof v === 'string') {
      searchCustomers(v);
    }
  }, [form, isBookingName, searchCustomers]);

  const handleSelect = useCallback(
    (customerName: string) => {
      const selectedCustomer = customers.find(c => c.name === customerName);
      if (selectedCustomer?.name) {
        setName(selectedCustomer.name);
      }
      if (selectedCustomer?._id) {
        form.setValue('customerId', selectedCustomer._id);
      }
      if (selectedCustomer?.email) {
        form.setValue('email', selectedCustomer.email);
        onFieldHighlight('email');
      }
      if (selectedCustomer?.phone) {
        form.setValue('phone', selectedCustomer.phone);
        onFieldHighlight('phone');
      }
      setSearch(customerName);
      setIsOpen(false);
    },
    [customers, form, onFieldHighlight, setName]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = normalizeCustomerNameWhileTyping(e.target.value);
      setSearch(value);
      setName(value);
      form.setValue('customerId', undefined);
      setIsOpen(true);
    },
    [form, setName]
  );

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, []);

  const profileCustomerId =
    typeof customerId === 'string' && customerId.trim() !== '' ? customerId.trim() : undefined;

  const showSearchPending =
    search.trim().length > 0 && (isFetchingCustomers || debouncedSearch !== search);

  const inputId = inputIdProp ?? (isBookingName ? 'manual-booking-name' : 'customer');

  return (
    <div
      className={cn(
        'mt-[6px] flex w-full max-md:mt-0 flex-col space-y-2 max-md:space-y-1 md:space-y-3',
        classNameProp
      )}
    >
      <div className="flex min-h-[1.25rem] max-md:min-h-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <Label className="max-md:text-xs leading-none" htmlFor={inputId}>
          Customer
        </Label>
        {profileCustomerId ? (
          <Link
            to={`/dashboard/customers/${profileCustomerId}`}
            onClick={() => onNavigateToCustomerProfile?.()}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            aria-label="View customer profile"
          >
            View Customer
            <ExternalLink className="size-3 shrink-0 opacity-80" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          value={search}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search or type customer name"
          aria-busy={showSearchPending}
          className={cn(
            'w-full focus-visible:ring-inset',
            showSearchPending && 'pr-10',
            nameError && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        {showSearchPending ? (
          <div
            className="pointer-events-none absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center"
            aria-hidden
          >
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {isOpen && (search || customers.length > 0) && (
          <div
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg"
            role="listbox"
            aria-label="Customer matches"
          >
            {showSearchPending ? (
              <div className="flex items-center gap-2 border-b border-border/80 bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                <span>Searching…</span>
              </div>
            ) : null}
            {isLoadingCustomers && customers.length === 0 ? (
              <div className="flex items-center gap-2 p-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Loading customers…
              </div>
            ) : customers.length === 0 ? (
              <div className="p-2.5 text-sm text-muted-foreground">No customers found</div>
            ) : (
              customers.map(customer => (
                <div
                  key={customer._id}
                  role="option"
                  className={cn(
                    'cursor-pointer p-2 text-sm hover:bg-muted',
                    showSearchPending && 'opacity-60'
                  )}
                  onMouseDown={() => customer.name && handleSelect(customer.name)}
                >
                  {customer.name}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {nameError ? <p className="mt-1 text-sm text-destructive">{nameError.message}</p> : null}
    </div>
  );
}
