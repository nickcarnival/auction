import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { BASE_URL } from '@/utils/environment-util';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormType,
} from '@shared/schemas/password-reset-schema';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { AUTH_DOCUMENT_BASE_TITLE } from '@/pages/auth/auth-document-title';

export default function ForgotPasswordPage() {
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = `Forgot password · ${AUTH_DOCUMENT_BASE_TITLE}`;
    return () => {
      document.title = previous;
    };
  }, []);

  const form = useForm<ForgotPasswordFormType>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async ({ email }: ForgotPasswordFormType) => {
    setSubmitError(null);
    setDoneMessage(null);
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim() }),
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof (payload as { error: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : await readResponseErrorMessage(response, 'Request failed');
      setSubmitError(msg);
      return;
    }
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : 'Check your email for a reset link.';
    setDoneMessage(message);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="text-center space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Logo className="size-12 text-primary" />
          </div>
          <CardTitle className="text-xl">Forgot password</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@shop.com"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
              {errors.email?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            {doneMessage ? (
              <p className="text-sm text-muted-foreground" role="status">
                {doneMessage}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <div className="w-full flex flex-col items-center gap-2">
              <Button type="submit" variant="solid" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
              {submitError ? (
                <p className="text-center text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
              <div className="mt-2 text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
