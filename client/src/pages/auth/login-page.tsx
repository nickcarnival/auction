import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useAuth } from '@/pages/auth/auth-provider';
import { AUTH_DOCUMENT_BASE_TITLE } from '@/pages/auth/auth-document-title';
import { type LoginFormType, loginSchema } from '@shared/schemas/login-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, Link } from 'react-router';

export default function LoginForm() {
  const { login, isLoginLoading, error, user, isUserLoading } = useAuth();

  useEffect(() => {
    const previous = document.title;
    document.title = `Sign in · ${AUTH_DOCUMENT_BASE_TITLE}`;
    return () => {
      document.title = previous;
    };
  }, []);

  const form = useForm<LoginFormType>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = ({ email, password }: LoginFormType) => {
    login({ email, password });
  };

  if (isUserLoading) {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard/schedule" replace />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="text-center space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Logo className="size-12 text-primary" />
          </div>
          <CardTitle className="text-xl">Sign in</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="janedoe@email.com"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
              {errors.email?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                {...register('password')}
              />
              {errors.password?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full flex flex-col items-center gap-1">
              <Button type="submit" variant="solid" className="w-full" disabled={isLoginLoading}>
                {isLoginLoading ? 'Signing in…' : 'Login'}
              </Button>
              {error ? (
                <div className="space-y-3">
                  <div className="text-center text-sm text-destructive" role="alert">
                    {error}
                  </div>
                  <div className="text-center text-sm">
                    <Link
                      to="/forgot-password"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
                  Create one here
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
