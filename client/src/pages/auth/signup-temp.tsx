import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';
import { useAuth } from '@/pages/auth/auth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form/form';
import { publicSignUpSchema, type PublicSignupFormType } from '@shared/schemas/signup-schema';
import { Link } from 'react-router';

export const SignupTemp = () => {
  const { publicSignup, isPublicSignupLoading, publicSignupError, publicSignupSuccess } = useAuth();

  const form = useForm<PublicSignupFormType>({
    resolver: zodResolver(publicSignUpSchema),
    defaultValues: {
      email: '',
      businessName: '',
      password: '',
    },
  });

  const onSubmit = (data: PublicSignupFormType) => {
    publicSignup(data);
  };

  if (publicSignupSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-lg shadow-sm">
          <CardHeader>
            <div className="flex flex-col items-center justify-center mb-4 gap-2">
              <Logo className="size-12 text-success-subtle-foreground" />
              <span className="text-xl font-bold text-success-subtle-foreground">Success</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 text-center">
              <p className="font-semibold text-success">Account created successfully</p>
              <p className="text-muted-foreground">{publicSignupSuccess}</p>
              <p className="text-sm text-muted-foreground">
                Your account has been created and is pending admin approval. You will receive a
                verification email once your account is approved, then you'll be able to access your
                dashboard.
              </p>
              <p className="text-sm font-medium text-warning-highlight">
                Status: Pending admin approval — no email will be sent until approved.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link to="/login">
              <Button>Go to login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader>
          <div className="flex flex-col items-center justify-center mb-4 gap-2">
            <Logo className="size-12 text-primary" />
            <span className="text-xl font-semibold tracking-tight">Create your account</span>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Start your free trial and create your business scheduling platform
          </p>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your business name"
                        type="text"
                        autoComplete="organization"
                        {...field}
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
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your email"
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a strong password"
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Must contain at least 8 characters and 3 of the following: uppercase letters,
                      lowercase letters, numbers, or special characters. Avoid common passwords.
                    </p>
                  </FormItem>
                )}
              />
              {publicSignupError && (
                <div className="text-destructive text-sm text-center p-2 bg-destructive/10 rounded border border-destructive/20">
                  {publicSignupError}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" variant="solid" className="w-full" disabled={isPublicSignupLoading}>
                {isPublicSignupLoading ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};
