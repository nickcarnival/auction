import { cn } from '@/lib/utils';
import { SVGProps } from 'react';

type LogoProps = SVGProps<SVGSVGElement>;

export const Logo = ({ className, ...props }: LogoProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-12 w-12 text-primary', className)}
      {...props}
    >
      <path d="M14.5 6.5c-1.5-1.5-3.5-1.5-5 0l-4 4C3.5 12.5 3.5 14.5 5 16c1.5 1.5 3.5 1.5 5 0l4-4c1.5-1.5 1.5-3.5 0-5z" />
      <path d="M5 16l-2 2" />
      <path d="M19 3l2 2" />
      <path d="M19 9l2-2" />
      <path d="M12 20v2" />
      <path d="M14.5 17.5L16 19" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="16" cy="16" r="1" />
    </svg>
  );
};
