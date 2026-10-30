import Image from 'next/image';
import { cn } from '@/lib/utils';

// In-list loading indicator; matches the route-level swirl in RouteLoading.
export const LogoSpinner = ({ size = 32, className }: { size?: number; className?: string }) => (
  <span role="status" aria-label="Loading" className={cn('inline-flex', className)}>
    <Image
      src="/edwhere-logo.png"
      alt=""
      width={size}
      height={size}
      className="animate-logo-swirl motion-reduce:animate-none"
    />
  </span>
);
