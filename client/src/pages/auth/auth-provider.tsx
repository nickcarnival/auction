import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BASE_URL, COOKIE_DOMAIN } from '@/utils/environment-util';
import { useCookies } from 'react-cookie';
import { useLocation, useNavigate } from 'react-router';
import type { UserAndTenant } from '@shared/user';
import {
  authSessionUserSchema,
  authTokenPairSchema,
  type AuthTokenPair,
} from '@shared/schemas/auth-session-schema';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { PLANDRY_SESSION_INVALID_EVENT } from '@/lib/api-response';
import { useSubdomainContext } from '../subdomain/subdomain-provider';
type LoginFormType = {
  email: string;
  password: string;
};

interface AuthContextType {
  user: UserAndTenant | null;
  login: (data: LoginFormType) => void;
  logout: () => void;
  signup: (data: { email: string; token: string; password: string }) => void;
  publicSignup: (data: { email: string; businessName: string; password: string }) => void;
  isLoginLoading: boolean;
  isSignupLoading: boolean;
  isPublicSignupLoading: boolean;
  isUserLoading: boolean;
  error: string | null;
  signupError: string | null;
  publicSignupError: string | null;
  publicSignupSuccess: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fallback when login/email-signup error body has no usable `message` / `error`. */
const AUTH_REQUEST_FAILED_MESSAGE = 'Something went wrong. Try again.';

/** Paths where missing session / failed user-by-token is expected; do not force logout. */
const PUBLIC_SESSION_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
]);

function parseAuthTokenResponse(raw: unknown): AuthTokenPair {
  const parsed = authTokenPairSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(AUTH_REQUEST_FAILED_MESSAGE);
  }
  return parsed.data;
}

const loginRequest = async (email: string, password: string) => {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response, AUTH_REQUEST_FAILED_MESSAGE));
  }

  return parseAuthTokenResponse(await response.json());
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserAndTenant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [publicSignupError, setPublicSignupError] = useState<string | null>(null);
  const [publicSignupSuccess, setPublicSignupSuccess] = useState<string | null>(null);
  const [cookies, setCookie, removeCookie] = useCookies(['auth-token']);

  const navigate = useNavigate();

  const location = useLocation();

  const {
    data: userData,
    isLoading: isUserLoading,
    ...userByTokenQuery
  } = useQuery({
    queryKey: ['user-by-token'],
    queryFn: async () => {
      const token =
        localStorage.getItem('auth-token') ||
        localStorage.getItem('token') ||
        cookies['auth-token'];

      if (!token) throw new Error('No token found');

      const response = await fetch(`${BASE_URL}/api/users/get-by-token`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Failed to fetch user data')
        );
      }

      const payload: unknown = await response.json();
      const parsed = authSessionUserSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Invalid user payload');
      }
      return parsed.data as UserAndTenant;
    },
    retry: 1,
  });

  const { isInternal } = useSubdomainContext();

  const logout = useCallback(() => {
    void fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('token');
    removeCookie('auth-token', { path: '/', domain: COOKIE_DOMAIN });
    queryClient.clear();
    navigate('/login', { replace: true });
  }, [navigate, queryClient, removeCookie]);

  useEffect(() => {
    const onSessionInvalid = () => {
      logout();
    };
    window.addEventListener(PLANDRY_SESSION_INVALID_EVENT, onSessionInvalid);
    return () => window.removeEventListener(PLANDRY_SESSION_INVALID_EVENT, onSessionInvalid);
  }, [logout]);

  /**
   * When there was never a token, `user-by-token` errors and stays in error until the cache is
   * updated. After login/signup we set query data so `isError` clears; otherwise navigation to
   * /dashboard would still see the stale error and call `logout()`.
   */
  useEffect(() => {
    if (!isInternal) {
      return;
    }

    if (!userByTokenQuery.isError) {
      return;
    }

    if (PUBLIC_SESSION_PATHS.has(location.pathname)) {
      return;
    }

    if (user != null) {
      return;
    }

    logout();
  }, [isInternal, userByTokenQuery.isError, location.pathname, user, logout]);

  const authUser = user ?? userData ?? null;

  const loginSignUpSuccess = (data: AuthTokenPair) => {
    const { token } = data;

    if (!token || !data.user._id) {
      throw new Error('Invalid token or user data');
    }

    localStorage.setItem('auth-token', token);

    setCookie('auth-token', token, {
      path: '/',
      maxAge: 3600000,
      sameSite: false,
    });

    queryClient.setQueryData(['user-by-token'], data.user as UserAndTenant);
    setUser(data.user as UserAndTenant);

    // Check if this is a new user (first login after email verification)
    // If user has no lastLogin date or it's very recent, start tour
    const isNewUser =
      !data.user.lastLogin ||
      (data.user.lastLogin && new Date(data.user.lastLogin) > new Date(Date.now() - 5 * 60 * 1000)); // Within 5 minutes

    if (isNewUser) {
      // Mark as new user for tour trigger and go to dashboard
      localStorage.setItem('trigger-tour', 'true');
      navigate('/dashboard/schedule');
    } else {
      navigate('/dashboard/schedule');
    }
  };

  const { mutate: signup, isPending: isSignupLoading } = useMutation({
    mutationFn: async (payload: { email: string; token: string; password: string }) => {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, AUTH_REQUEST_FAILED_MESSAGE));
      }

      return parseAuthTokenResponse(await response.json());
    },
    onMutate: () => setSignupError(null),
    onSuccess: loginSignUpSuccess,
    onError: err => {
      setSignupError(err.message);
    },
    retry: 0,
  });

  const { mutate: publicSignup, isPending: isPublicSignupLoading } = useMutation({
    mutationFn: async (payload: { email: string; businessName: string; password: string }) => {
      const response = await fetch(`${BASE_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Signup failed'));
      }

      return await response.json();
    },
    onSuccess: data => {
      setPublicSignupSuccess(data.message);
      setPublicSignupError(null);
    },
    onError: (err: Error) => {
      setPublicSignupError(err.message);
      setPublicSignupSuccess(null);
    },
    retry: 0,
  });

  const { mutate: login, isPending: isLoginLoading } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => {
      return loginRequest(email, password);
    },
    onMutate: () => setError(null),
    onSuccess: loginSignUpSuccess,
    onError: err => {
      setError(err.message);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: authUser,
        login,
        isSignupLoading,
        signupError,
        signup,
        publicSignup,
        isPublicSignupLoading,
        publicSignupError,
        publicSignupSuccess,
        logout,
        isUserLoading,
        isLoginLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
