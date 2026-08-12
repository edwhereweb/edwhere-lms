import { SignIn } from '@clerk/nextjs';
import { getSafeNextOrFallback } from '@/lib/redirect';

export default function Page({ searchParams }: { searchParams: { next?: string } }) {
  const safeNext = getSafeNextOrFallback(searchParams.next);

  return (
    <SignIn
      forceRedirectUrl={safeNext}
      fallbackRedirectUrl={safeNext}
      signUpForceRedirectUrl={safeNext}
      signUpFallbackRedirectUrl={safeNext}
    />
  );
}
