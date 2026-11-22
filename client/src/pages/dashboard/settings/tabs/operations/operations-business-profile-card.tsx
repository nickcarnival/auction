import { Tenant } from '@shared/tenant';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BASE_URL, COOKIE_DOMAIN } from '@/utils/environment-util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { Input } from '@/components/ui/input';
import { PhoneField } from '@/components/ui/form/phone-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { readResponseErrorMessage } from '@shared/read-response-error-message';

const businessFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  redirectUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

type BusinessFormType = z.infer<typeof businessFormSchema>;

type OperationsBusinessProfileCardProps = {
  tenantId: string | undefined;
  tenant: Tenant;
};

export function OperationsBusinessProfileCard({
  tenantId,
  tenant,
}: OperationsBusinessProfileCardProps) {
  const queryClient = useQueryClient();

  const form = useForm<BusinessFormType>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: '',
      redirectUrl: '',
      phone: '',
      email: '',
    },
    values: {
      name: tenant.name ?? '',
      redirectUrl: tenant.redirectUrl ?? '',
      phone: tenant.phone ?? '',
      email: tenant.email ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (formData: BusinessFormType) => {
      const response = await fetch(`${BASE_URL}/api/tenants/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          _id: tenantId,
          name: formData.name,
          redirectUrl: formData.redirectUrl,
          phone: formData.phone,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Failed to update business profile')
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-by-id'] });
      queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      toast.success('Business profile saved');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to save business profile');
    },
  });

  const { bookingSlug, bookingUrlHref, urlLeading, urlHostAfterSlug } = useMemo(() => {
    const slug =
      (typeof tenant.subdomain === 'string' && tenant.subdomain.trim().toLowerCase()) ||
      tenant.name?.toLowerCase().replace(/\s+/g, '') ||
      '';
    if (!slug) {
      return { bookingSlug: '', bookingUrlHref: '', urlLeading: '', urlHostAfterSlug: '' };
    }
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    const hostAfterSlug =
      COOKIE_DOMAIN === 'localhost' ? `.localhost${port}` : `.${COOKIE_DOMAIN}`;
    return {
      bookingSlug: slug,
      bookingUrlHref: `${protocol}//${slug}${hostAfterSlug}`,
      urlLeading: `${protocol}//`,
      urlHostAfterSlug: hostAfterSlug,
    };
  }, [tenant.subdomain, tenant.name]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(values => updateMutation.mutate(values))}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6 md:gap-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your business name" />
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
                  <FormLabel>Business email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="business@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PhoneField
              form={form}
              name="phone"
              label="Business phone"
              placeholder="555-123-4567"
            />

            <FormField
              control={form.control}
              name="redirectUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://yourbusiness.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-relaxed">
              <Link
                to="/dashboard/settings/business"
                className="shrink-0 font-medium text-primary underline-offset-4 hover:underline"
              >
                Public booking page:
              </Link>
              {bookingUrlHref ? (
                <a
                  href={bookingUrlHref}
                  className="min-w-0 break-all font-mono text-primary underline-offset-4 hover:underline"
                  translate="no"
                >
                  <span>{urlLeading}</span>
                  <strong className="font-semibold text-foreground">{bookingSlug}</strong>
                  <span>{urlHostAfterSlug}</span>
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            <div className="md:col-span-2">
              <Button type="submit" variant="solid" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save business profile'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
