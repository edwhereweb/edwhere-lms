import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { adminEnrolSchema } from '@/lib/validations';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const profile = await currentProfile();

    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden', 403);
    }

    if (isRateLimited(`admin-enrol:${profile.userId}`, { maxRequests: 10, windowMs: 60_000 })) {
      return apiError('Too many requests', 429);
    }

    const { courseId } = params;

    const course = await db.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return apiError('Course not found', 404);
    }

    const body = await req.json();
    const validation = validateBody(adminEnrolSchema, body);
    if (!validation.success) return validation.response;

    const { students, onboardingSource } = validation.data;

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; reason: string }[],
      alreadyEnrolled: [] as string[]
    };

    for (const student of students) {
      try {
        let targetUserId: string | null = null;

        let targetUser = await db.profile.findFirst({
          where: { email: { equals: student.email, mode: 'insensitive' } }
        });

        if (targetUser) {
          targetUserId = targetUser.userId;
        } else {
          const currentClerkClient = await clerkClient();
          const clerkUserList = await currentClerkClient.users.getUserList({
            emailAddress: [student.email]
          });

          let clerkUserId: string;

          if (clerkUserList.data && clerkUserList.data.length > 0) {
            clerkUserId = clerkUserList.data[0].id;
          } else {
            const nameParts = student.name !== 'N/A' ? student.name.split(' ') : [];
            const firstName = nameParts.length > 0 ? nameParts[0] : 'Student';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

            const newClerkUser = await currentClerkClient.users.createUser({
              emailAddress: [student.email],
              firstName: firstName,
              lastName: lastName,
              skipPasswordChecks: true,
              skipPasswordRequirement: true
            });
            clerkUserId = newClerkUser.id;
          }

          targetUser = await db.profile.create({
            data: {
              userId: clerkUserId,
              email: student.email.toLowerCase(),
              name: student.name !== 'N/A' ? student.name : 'Student',
              role: 'STUDENT'
            }
          });

          targetUserId = targetUser.userId;
        }

        if (!targetUserId) {
          results.failed.push({
            email: student.email,
            reason: 'Failed to resolve user account.'
          });
          continue;
        }

        const existingPurchase = await db.purchase.findUnique({
          where: {
            userId_courseId: {
              userId: targetUserId,
              courseId: courseId
            }
          }
        });

        if (existingPurchase) {
          results.alreadyEnrolled.push(student.email);
          continue;
        }

        const onboardingData: Record<string, string> = {
          onboardingSource: student.onboardingSource ?? onboardingSource ?? 'MANUAL'
        };
        await db.purchase.create({
          data: {
            userId: targetUserId,
            courseId: courseId,
            ...onboardingData
          }
        });

        results.successful.push(student.email);
      } catch (studentError) {
        const { logError } = await import('@/lib/debug');
        logError('ADMIN_ENROL_STUDENT', studentError);

        results.failed.push({
          email: student.email,
          reason: 'An error occurred during account creation or enrolment.'
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return handleApiError('ADMIN_ENROL', error);
  }
}
