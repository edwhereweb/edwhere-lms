import { redirect } from 'next/navigation';
import { Percent } from 'lucide-react';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { CouponsClient } from './_components/coupons-client';

export const dynamic = 'force-dynamic';

const CouponsPage = async () => {
  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') {
    return redirect('/dashboard');
  }

  const [coupons, courses] = await Promise.all([
    db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } }
    }),
    db.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: 'asc' }
    })
  ]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-x-2 mb-6">
        <Percent className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Coupons</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Create and manage discount coupons for course purchases. Coupons are re-validated
        server-side at checkout, so client-side previews can never be tampered with.
      </p>

      <CouponsClient initialCoupons={JSON.parse(JSON.stringify(coupons))} courses={courses} />
    </div>
  );
};

export default CouponsPage;
