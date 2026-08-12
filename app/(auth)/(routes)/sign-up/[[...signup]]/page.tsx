import { SignUp } from '@clerk/nextjs';
import { getSafeNextOrFallback } from '@/lib/redirect';

export default function Page({ searchParams }: { searchParams: { next?: string } }) {
  const safeNext = getSafeNextOrFallback(searchParams.next);

  return (
    <SignUp
      forceRedirectUrl={safeNext}
      fallbackRedirectUrl={safeNext}
      signInForceRedirectUrl={safeNext}
      signInFallbackRedirectUrl={safeNext}
    />
  );
}
