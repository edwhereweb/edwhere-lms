import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/format';
import { CAMPAIGN_COOKIE_NAME } from '@/lib/campaign-cookie';
import { resolveCouponPreviewForCourse } from '@/lib/coupons';
import { CheckoutClient } from './_components/checkout-client';

type CheckoutPageProps = {
  searchParams: {
    courseId?: string;
    intent?: string;
    coupon?: string;
    ct?: string;
  };
};

type AutoAppliedCouponResult =
  | {
      status: 'applied';
      code: string;
      originalPrice: number;
      discountAmount: number;
      finalPrice: number;
      message: string;
    }
  | {
      status: 'invalid';
      message: string;
    }
  | null;

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { userId } = await auth();
  if (!userId) {
    const query = new URLSearchParams();
    if (searchParams.courseId) query.set('courseId', searchParams.courseId);
    if (searchParams.intent) query.set('intent', searchParams.intent);
    if (searchParams.coupon) query.set('coupon', searchParams.coupon);
    if (searchParams.ct) query.set('ct', searchParams.ct);

    const next = `/checkout?${query.toString()}`;
    return redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  const courseId = searchParams.courseId;
  if (!courseId) {
    return redirect('/courses');
  }

  const [course, purchase, user, latestOrder] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId, isPublished: true },
      select: { id: true, title: true, price: true, slug: true }
    }),
    db.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      }
    }),
    currentUser(),
    db.courseOrder.findFirst({
      where: {
        userId,
        courseId,
        status: {
          in: ['PENDING', 'FAILED', 'CANCELLED']
        }
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        failureDescription: true,
        updatedAt: true
      }
    })
  ]);

  if (!course || !course.price || course.price <= 0) {
    return redirect('/courses');
  }

  if (purchase) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold mb-3">You&apos;re already enrolled</h1>
        <p className="text-muted-foreground mb-6">Continue learning in {course.title}.</p>
        <Link
          href={`/courses/${course.id}/start`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#6715FF] text-white font-semibold"
        >
          Go to Course
        </Link>
      </div>
    );
  }

  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const userName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || primaryEmail.split('@')[0] || '';

  // Resolve coupon preview from URL (applied on course page or via promo link)
  // or signed campaign cookie set by middleware. Always re-validated server-side.
  const couponPreview = await resolveCouponPreviewForCourse({
    courseId: course.id,
    originalPriceInRupees: course.price,
    couponCode: searchParams.coupon,
    campaignToken: searchParams.ct,
    campaignCookieToken: cookies().get(CAMPAIGN_COOKIE_NAME)?.value,
    userId
  });

  const autoAppliedCoupon: AutoAppliedCouponResult =
    couponPreview?.status === 'applied'
      ? {
          status: 'applied',
          code: couponPreview.code,
          originalPrice: couponPreview.originalPrice,
          discountAmount: couponPreview.discountAmount,
          finalPrice: couponPreview.finalPrice,
          message: couponPreview.message
        }
      : couponPreview?.status === 'invalid'
        ? {
            status: 'invalid',
            message: couponPreview.message
          }
        : null;

  return (
    <CheckoutClient
      courseId={course.id}
      courseSlug={course.slug}
      courseTitle={course.title}
      amount={course.price}
      amountLabel={formatPrice(course.price)}
      userName={userName}
      userEmail={primaryEmail}
      latestOrder={latestOrder}
      intent={searchParams.intent ?? null}
      autoAppliedCoupon={autoAppliedCoupon}
    />
  );
}
