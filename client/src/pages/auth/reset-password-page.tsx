import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router';
import { BASE_URL } from '@/utils/environment-util';
import { useQuery } from '@tanstack/react-query';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import {
  resetPasswordFormSchema,
  type ResetPasswordFormType,
} from '@shared/schemas/password-reset-schema';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { AUTH_DOCUMENT_BASE_TITLE } from '@/pages/auth/auth-document-title';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = `Reset password · ${AUTH_DOCUMENT_BASE_TITLE}`;
    return () => {
      document.title = previous;
    };
  }, []);

  const { data: tokenOk, isLoading: checkingToken } = useQuery({
    queryKey: ['verify-reset-token', token],
    enabled: token.length > 0,
    queryFn: async () => {
      const response = await fetch(
        `${BASE_URL}/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
        { credentials: 'include' }
      );
      if (!response.ok) return false;
      const body: unknown = await response.json();
      return (
        typeof body === 'object' &&
        body !== null &&
        'ok' in body &&
        (body as { ok: unknown }).ok === true
      );
    },
    retry: false,
  });

  const form = useForm<ResetPasswordFormType>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', token },
    mode: 'onTouched',
  });

  useEffect(() => {
    form.setValue('token', token);
  }, [token, form]);

  const onSubmit = async ({ password }: ResetPasswordFormType) => {
    setSubmitError(null);
    const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      setSubmitError(await readResponseErrorMessage(response, 'Could not reset password'));
      return;
    }
    setDone(true);
  };

  const invalidToken = !token || (!checkingToken && tokenOk === false);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="text-center space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Logo className="size-12 text-primary" />
          </div>
          <CardTitle className="text-xl">New password</CardTitle>
        </CardHeader>
        {checkingToken ? (
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">Checking your link…</p>
          </CardContent>
        ) : null}
        {invalidToken && !checkingToken ? (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">Forgot password</Link>
            </Button>
          </CardContent>
        ) : null}
        {done ? (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Your password was updated. Sign in with your new password.
            </p>
            <Button asChild variant="solid" className="w-full">
              <Link to="/login">Sign in</Link>
            </Button>
          </CardContent>
        ) : null}
        {!invalidToken && !done && !checkingToken && tokenOk ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="At least 8 characters, mixed strength"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <div className="w-full flex flex-col items-center gap-2">
                  <Button type="submit" variant="solid" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving…' : 'Save password'}
                  </Button>
                  {submitError ? (
                    <p className="text-center text-sm text-destructive" role="alert">
                      {submitError}
                    </p>
                  ) : null}
                </div>
              </CardFooter>
            </form>
          </Form>
        ) : null}
      </Card>
    </div>
  );
}
