import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Inbox, Loader2, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';

import { Appointment } from '@shared/appointment';
import type { CustomerWithStats } from '@shared/customer';
import {
  customerProfileFieldsSchema,
  type CustomerProfileFields,
} from '@shared/schemas/customer-update-schema';
import { normalizeCustomerNameWhileTyping } from '@shared/customer-name-utils';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { BASE_URL } from '@/utils/environment-util';
import { useAuth } from '@/pages/auth/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { PhoneField } from '@/components/ui/form/phone-field';
import { Input } from '@/components/ui/input';

interface CustomerProfileSectionProps {
  customer: CustomerWithStats;
  appointments: Appointment[] | undefined;
}

export function CustomerProfileSection({ customer, appointments }: CustomerProfileSectionProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();

  const vehicles = useMemo(() => {
    const list =
      appointments
        ?.filter(a => a.vehicle?.trim())
        .map(a => a.vehicle as string)
        .filter((v, i, self) => self.indexOf(v) === i) ?? [];
    return list;
  }, [appointments]);

  const form = useForm<CustomerProfileFields>({
    resolver: zodResolver(customerProfileFieldsSchema),
    values: {
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CustomerProfileFields) => {
      const response = await fetch(`${BASE_URL}/api/customers/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer._id,
          name: data.name.trim(),
          email: data.email,
          phone: data.phone,
        }),
      });
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Could not save customer'));
      }
    },
    onSuccess: async () => {
      toast.success('Customer saved');
      await queryClient.invalidateQueries({ queryKey: ['customer', customer._id] });
      await queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
      await queryClient.invalidateQueries({ queryKey: ['customer-appointments', customer._id] });
      await queryClient.invalidateQueries({ queryKey: ['get-all-appointments'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isDirty = form.formState.isDirty;
  const displayName = form.watch('name').trim() || customer.name || 'Customer';

  if (!customer._id) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Edit contact info below. Vehicle list comes from past appointments.
            </p>
          </div>
          <div className="flex w-fit shrink-0 flex-col items-end gap-1.5 sm:items-start">
            <Badge variant="secondary" className="tabular-nums text-sm">
              {customer.appointmentCount}{' '}
              {customer.appointmentCount === 1 ? 'Appointment' : 'Appointments'}
            </Badge>
            <Badge
              variant="outline"
              className="tabular-nums text-sm"
              title="Booking requests linked to this customer"
            >
              <Inbox className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
              {customer.bookingRequestCount ?? 0}{' '}
              {(customer.bookingRequestCount ?? 0) === 1 ? 'Request' : 'Requests'}
            </Badge>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(data => saveMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      {...field}
                      onChange={e => field.onChange(normalizeCustomerNameWhileTyping(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <PhoneField
              form={form}
              name="phone"
              label={
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Phone
                </span>
              }
              placeholder="Optional"
            />

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button type="submit" variant="solid" disabled={saveMutation.isPending || !isDirty}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saveMutation.isPending || !isDirty}
                onClick={() =>
                  form.reset({
                    name: customer.name ?? '',
                    email: customer.email ?? '',
                    phone: customer.phone ?? '',
                  })
                }
              >
                Discard
              </Button>
            </div>

            {vehicles.length > 0 ? (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-foreground">Vehicles</p>
                <ul className="list-none space-y-1.5 pl-0 text-sm text-foreground">
                  {vehicles.map(v => (
                    <li key={v} className="rounded-md border bg-muted/30 px-3 py-2 [overflow-wrap:anywhere]">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
