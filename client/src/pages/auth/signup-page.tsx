import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useAuth } from '@/pages/auth/auth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router';
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
import type { Invite } from '@shared/invite';
import { SignupFormType, signUpSchema } from '@shared/schemas/signup-schema';
import { SignupTemp } from './signup-temp';
import { AUTH_DOCUMENT_BASE_TITLE } from '@/pages/auth/auth-document-title';
import { readResponseErrorMessage } from '@shared/read-response-error-message';

export default function SignUp() {
  const { signup, isSignupLoading, signupError } = useAuth();

  useEffect(() => {
    const previous = document.title;
    document.title = `Create account · ${AUTH_DOCUMENT_BASE_TITLE}`;
    return () => {
      document.title = previous;
    };
  }, []);

  const form = useForm<SignupFormType>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { password: '' },
    mode: 'onTouched',
  });

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    data,
    isLoading,
    isError,
  } = useQuery<{ invite: Invite }>({
    queryKey: ['prefill-signup', token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await fetch(
        `${BASE_URL}/api/auth/prefill-signup?token=${encodeURIComponent(token!)}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Invalid or expired invite'));
      }
      return (await response.json()) as { invite: Invite };
    },
    retry: false,
  });

  if (!token) {
    return <SignupTemp />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4 text-muted-foreground text-sm">
        Loading invitation…
      </div>
    );
  }

  if (isError || !data?.invite) {
    return <SignupTemp />;
  }

  const onSubmit = ({ password }: SignupFormType) => {
    signup({ email: data.invite.email, password, token });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="text-center space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Logo className="size-12 text-primary" />
          </div>
          <CardTitle className="text-xl">Create account</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  disabled
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={data.invite.email}
                  readOnly
                />
              </div>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
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
                <Button type="submit" variant="solid" className="w-full" disabled={isSignupLoading}>
                  {isSignupLoading ? <span>Creating account…</span> : <span>Signup</span>}
                </Button>
                {signupError ? (
                  <p className="text-center text-sm text-destructive" role="alert">
                    {signupError}
                  </p>
                ) : null}
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
