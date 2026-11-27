import type { ReactNode } from 'react';

import { LoaderCircle } from 'lucide-react';

export default function LoadingMessage({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {children}
    </p>
  );
}
