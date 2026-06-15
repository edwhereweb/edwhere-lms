import { auth } from '@clerk/nextjs/server';
import {
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import { z } from 'zod';

const enrolSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  email: z.string().email('Valid email is required')
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(enrolSchema, body);
    if (!result.success) return result.response;

    const { courseId, email } = result.data;

    const studentProfile = await db.profile.findFirst({
      where: { email: email.toLowerCase() }
    });
    if (!studentProfile) {
      return mobileError('NOT_FOUND', 'No user found with that email', 404);
    }

    const existing = await db.purchase.findFirst({
      where: { userId: studentProfile.userId, courseId }
    });
    if (existing) {
      return mobileError('CONFLICT', 'Student is already enrolled in this course', 409);
    }

    const purchase = await db.purchase.create({
      data: {
        userId: studentProfile.userId,
        courseId,
        onboardingSource: 'MANUAL'
      }
    });

    return mobileCreated(purchase);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ENROLMENTS_CREATE', error);
  }
}
