import type { Tenant } from '@shared/tenant';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { BASE_URL } from '@/utils/environment-util';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { PhoneField } from '@/components/ui/form/phone-field';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  phone: z.string().optional(),
  email: z.union([z.string().email('Enter a valid email'), z.literal('')]),
});

type TenantCreateForm = z.infer<typeof formSchema>;

export function TenantForm() {
  const form = useForm<TenantCreateForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
  });

  const queryClient = useQueryClient();

  const { mutateAsync: addTenant, isPending } = useMutation({
    mutationFn: async (payload: Tenant) => {
      const response = await fetch(`${BASE_URL}/api/tenants/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to create tenant'));
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  async function onSubmit(values: TenantCreateForm) {
    const email = values.email?.trim() || undefined;
    try {
      await addTenant({
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        email,
        tier: 'customer',
        active: true,
      });
      toast.success('Tenant created');
      form.reset({
        name: '',
        phone: '',
        email: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tenant');
    }
  }

  return (
    <Card className="shadow-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 pt-6">
            <CardTitle className="text-base font-medium">Add tenant</CardTitle>
            <Button type="submit" variant="solid" size="sm" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Creating" />
              ) : (
                'Create'
              )}
            </Button>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="organization" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <PhoneField
                form={form}
                name="phone"
                label="Phone"
                placeholder="555-123-4567"
              />
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
