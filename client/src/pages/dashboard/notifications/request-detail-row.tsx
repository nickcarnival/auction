import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface RequestDetailRowProps {
  children: ReactNode;
  className?: string;
}

export function RequestDetailRow({ children, className }: RequestDetailRowProps) {
  return <p className={cn('text-sm leading-relaxed text-foreground', className)}>{children}</p>;
}
