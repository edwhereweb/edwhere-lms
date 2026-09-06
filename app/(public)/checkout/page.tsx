import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/format';
import { CAMPAIGN_COOKIE_NAME, verifyCampaignCookieValue } from '@/lib/campaign-cookie';
import { resolveCampaignCouponCode, validateCouponForCourse } from '@/lib/coupons';
import { CheckoutClient } from './_components/checkout-client';

type CheckoutPageProps = {
  searchParams: {
    courseId?: string;
    intent?: string;
  };
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { userId } = await auth();
  if (!userId) {
    const next = searchParams.courseId
      ? `/checkout?courseId=${encodeURIComponent(searchParams.courseId)}`
      : '/checkout';
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

  // Resolve a Meta Ads (or other campaign) auto-apply coupon from the
  // signed cookie set by middleware — always re-validated server-side via
  // the same `validateCouponForCourse` path a manually typed code goes
  // through, so a forged/expired cookie can never affect the price.
  const autoAppliedCoupon = await getAutoAppliedCouponPreview({
    userId,
    courseId: course.id,
    originalAmountInPaise: Math.round(course.price * 100)
  });

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

async function getAutoAppliedCouponPreview({
  userId,
  courseId,
  originalAmountInPaise
}: {
  userId: string;
  courseId: string;
  originalAmountInPaise: number;
}) {
  try {
    const cookieValue = cookies().get(CAMPAIGN_COOKIE_NAME)?.value;
    const token = await verifyCampaignCookieValue(cookieValue);
    if (!token) return null;

    const couponCode = await resolveCampaignCouponCode(token);
    if (!couponCode) return null;

    const result = await validateCouponForCourse({
      code: couponCode,
      courseId,
      userId,
      originalAmountInPaise
    });

    if (!result.valid) return null;

    return {
      code: result.coupon.code,
      originalPrice: result.originalAmountInPaise / 100,
      discountAmount: result.discountAmountInPaise / 100,
      finalPrice: result.finalAmountInPaise / 100,
      message: `Coupon "${result.coupon.code}" applied automatically.`
    };
  } catch {
    // Fail open: never block checkout if campaign resolution errors out.
    return null;
  }
}
