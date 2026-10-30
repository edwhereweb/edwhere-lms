import { Loader2 } from 'lucide-react';

export const RouteLoading = () => (
  <div className="flex h-full items-center justify-center p-6" role="status" aria-label="Loading">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);
