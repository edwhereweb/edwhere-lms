import Image from 'next/image';

export const RouteLoading = () => (
  <div className="flex h-full items-center justify-center p-6" role="status" aria-label="Loading">
    <Image
      src="/edwhere-logo.png"
      alt=""
      width={48}
      height={48}
      priority
      className="animate-logo-swirl"
    />
  </div>
);
