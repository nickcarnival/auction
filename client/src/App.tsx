import { AppProviders } from './app/app-providers';
import { BrowserRouter } from 'react-router';
import { AppRouter } from './app/app-router';
import ErrorBoundary from './app/error-boundary';
import { Suspense } from 'react';
import { GenericFallback } from './components/generic-fallback';

export const App = () => {
  return (
    <BrowserRouter>
      <AppProviders>
        <Suspense fallback={<GenericFallback />}>
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
        </Suspense>
      </AppProviders>
    </BrowserRouter>
  );
};
