import { Tenant, shopHoursSchema } from '@shared/tenant';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BASE_URL, COOKIE_DOMAIN } from '@/utils/environment-util';
import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { Skeleton } from '@/components/ui/skeleton';
import { GenericField } from '@/components/ui/form/generic-field';
import { PhoneField } from '@/components/ui/form/phone-field';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_SHOP_HOURS } from '@shared/shop-hours';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { readResponseErrorMessage } from '@shared/read-response-error-message';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  redirectUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  shopHours: shopHoursSchema,
});

type FormType = z.infer<typeof formSchema>;

type TenantInfoProps = {
  tenantId: string | undefined;
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}));

export const TenantInfo = ({ tenantId }: TenantInfoProps) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant-by-id', tenantId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${tenantId}`, {
        credentials: 'include',
      });
      return await response.json();
    },
    enabled: !!tenantId,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      redirectUrl: '',
      phone: '',
      email: '',
      shopHours: DEFAULT_SHOP_HOURS,
    },
    values: {
      name: data?.name ?? '',
      redirectUrl: data?.redirectUrl ?? '',
      phone: data?.phone ?? '',
      email: data?.email ?? '',
      shopHours: data?.shopHours ?? DEFAULT_SHOP_HOURS,
    },
  });

  // Watch for changes to openHour and auto-adjust closeHour if needed
  const openHour = form.watch('shopHours.openHour');
  const closeHour = form.watch('shopHours.closeHour');

  useEffect(() => {
    if (closeHour && openHour && closeHour <= openHour) {
      // Auto-adjust closeHour to be at least 1 hour after openHour
      const newCloseHour = Math.min(openHour + 1, 23);
      form.setValue('shopHours.closeHour', newCloseHour);
    }
  }, [openHour, closeHour, form]);

  const mutation = useMutation({
    mutationFn: async (tenant: FormType) => {
      const response = await fetch(`${BASE_URL}/api/tenants/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...tenant, _id: tenantId }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to update tenant'));
      }

      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-by-id'] });
      await queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      form.reset();
      toast.success('Tenant settings saved');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to save tenant settings');
    },
  });

  if (!data || isLoading) return <Skeleton className="w-full h-full" />;

  const publicSlug =
    (typeof data.subdomain === 'string' && data.subdomain.trim().toLowerCase()) ||
    data.name.split(/\s+/).join('').toLowerCase();
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  const urlHostAfterSlug =
    COOKIE_DOMAIN === 'localhost' ? `.localhost${port}` : `.${COOKIE_DOMAIN}`;
  const urlLeading = `${protocol}//`;
  const urlThing = `${urlLeading}${publicSlug}${urlHostAfterSlug}`;
  const dummyRedirectUrl = `https://www.${data.name.split(' ').join('').toLocaleLowerCase()}.com`;

  const onSubmit = (values: FormType) => {
    mutation.mutate(values);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-col items-start gap-2 space-y-0">
          <span>Tenant Settings</span>
          <div className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-normal">
            <Link
              to="/dashboard/settings/business"
              className="shrink-0 font-medium text-primary underline-offset-4 hover:underline"
            >
              Public booking page:
            </Link>
            <Link
              className="inline-flex min-w-0 max-w-full items-center gap-2 break-all font-mono text-primary hover:underline"
              to={urlThing}
              translate="no"
            >
              <span>
                <span>{urlLeading}</span>
                <strong className="font-semibold text-foreground">{publicSlug}</strong>
                <span>{urlHostAfterSlug}</span>
              </span>
              <ExternalLink className="size-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <GenericField
                form={form}
                name="name"
                label="Tenant Name"
                placeholder="Enter tenant name"
              />
            </div>

            <div>
              <GenericField
                form={form}
                name="redirectUrl"
                label="Redirect URL"
                placeholder={dummyRedirectUrl}
              />

              <PhoneField
                form={form}
                name="phone"
                label="Phone"
                placeholder="555-123-4567"
              />

              <GenericField
                form={form}
                name="email"
                type="email"
                label="Email"
                placeholder={data.name.split(' ').join('').toLocaleLowerCase() + '@plandry.org'}
              />
            </div>

            {/* Shop Hours Section */}
            <div className="mt-6 p-3 border rounded-md space-y-3">
              <h3 className="text-lg font-semibold">Shop Hours</h3>

              {/* Days Open */}
              <FormField
                control={form.control}
                name="shopHours.daysOpen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Open</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <FormItem
                          key={day.value}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={checked => {
                                const currentDays = field.value || [];
                                if (checked) {
                                  field.onChange([...currentDays, day.value]);
                                } else {
                                  field.onChange(currentDays.filter(d => d !== day.value));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">{day.label}</FormLabel>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Opening Hour */}
              <FormField
                control={form.control}
                name="shopHours.openHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Hour</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select opening hour" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOUR_OPTIONS.map(hour => (
                          <SelectItem key={hour.value} value={hour.value.toString()}>
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Closing Hour */}
              <FormField
                control={form.control}
                name="shopHours.closeHour"
                render={({ field }) => {
                  const validCloseHours = HOUR_OPTIONS.filter(hour => hour.value > (openHour || 0));

                  return (
                    <FormItem>
                      <FormLabel>Closing Hour</FormLabel>
                      <Select
                        onValueChange={value => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select closing hour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {validCloseHours.map(hour => (
                            <SelectItem key={hour.value} value={hour.value.toString()}>
                              {hour.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <Button className="mt-6" type="submit" variant="solid">
              Save Settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
