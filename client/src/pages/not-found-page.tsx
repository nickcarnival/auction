import { Home, ArrowLeft, CircleParkingOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { HOME_URL } from '@/utils/environment-util';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-muted p-4">
      <div className="text-center space-y-6 max-w-md">
        <CircleParkingOff className="w-24 h-24 mx-auto text-destructive animate-bounce" />
        <h1 className="text-4xl font-bold text-foreground">Oops! Wrong Turn</h1>
        <p className="text-xl text-muted-foreground">
          Looks like you've veered off the main road. This page doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous Page
          </Button>
          <Link to={HOME_URL}>
            <Button className="flex items-center justify-center">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
