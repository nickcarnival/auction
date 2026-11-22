import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode | ((error: Error | null, errorInfo: ErrorInfo | null) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(e: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: e, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Store the error info in state so the fallback UI can access it
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        // If fallback is a function, call it with error details
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.state.errorInfo);
        }
        return this.props.fallback;
      }
      return (
        <div className="w-full h-screen bg-destructive/10 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-destructive shadow-lg">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                An error occurred
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive mb-4">
                {this.state?.error?.message ?? 'unknown error'}
              </p>
              {this.state.errorInfo && (
                <details className="mt-4 w-full">
                  <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-muted-foreground">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-3 rounded border border-border overflow-auto max-h-40 text-foreground">
                    {this.state.error?.stack}
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
              <Button variant="default" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
