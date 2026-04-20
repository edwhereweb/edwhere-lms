import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

const enrolSchema = z.object({
  onboardingSource: z.enum(['MANUAL', 'PAID_MANUAL']).optional(),
  students: z.array(
    z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      onboardingSource: z.enum(['MANUAL', 'PAID_MANUAL']).optional()
    })
  )
});

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const profile = await currentProfile();

    if (!profile || profile.role !== 'ADMIN') {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { courseId } = params;

    // Ensure course exists
    const course = await db.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return apiErr('NOT_FOUND', 'Course not found', 404);
    }

    const body = await req.json();
    const validation = validateRequest(enrolSchema, body);
    if (!validation.success) return validation.response;

    const { students, onboardingSource } = validation.data;

    if (!students || students.length === 0) {
      return apiErr('VALIDATION', 'No students provided', 400);
    }

    // Process enrolments
    const results = {
      successful: [] as string[],
      failed: [] as { email: string; reason: string }[],
      alreadyEnrolled: [] as string[]
    };

    for (const student of students) {
      try {
        let targetUserId: string | null = null;

        // 1. Find the user profile by email in our local DB
        let targetUser = await db.profile.findFirst({
          where: { email: { equals: student.email, mode: 'insensitive' } }
        });

        if (targetUser) {
          targetUserId = targetUser.userId;
        } else {
          // 2. User doesn't exist locally. Check Clerk.
          const currentClerkClient = await clerkClient();
          const clerkUserList = await currentClerkClient.users.getUserList({
            emailAddress: [student.email]
          });

          let clerkUserId: string;

          if (clerkUserList.data && clerkUserList.data.length > 0) {
            // User exists in Clerk but not in our DB
            clerkUserId = clerkUserList.data[0].id;
          } else {
            // 3. User doesn't exist in Clerk either. Create them.
            // Split name into first and last for Clerk
            const nameParts = student.name !== 'N/A' ? student.name.split(' ') : [];
            const firstName = nameParts.length > 0 ? nameParts[0] : 'Student';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

            const newClerkUser = await currentClerkClient.users.createUser({
              emailAddress: [student.email],
              firstName: firstName,
              lastName: lastName,
              skipPasswordChecks: true, // We don't set a password here, they will use forgot password or magic link
              skipPasswordRequirement: true
            });
            clerkUserId = newClerkUser.id;
          }

          // 4. Create the local Profile
          targetUser = await db.profile.create({
            data: {
              userId: clerkUserId,
              email: student.email,
              name: student.name !== 'N/A' ? student.name : 'Student',
              role: 'STUDENT'
            }
          });

          targetUserId = targetUser.userId;
        }

        if (!targetUserId) {
          results.failed.push({
            email: student.email,
            reason: 'Failed to find or create user account.'
          });
          continue;
        }

        // 5. Check if already enrolled
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

        // 6. Create new purchase to grant access
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
      } catch (err) {
        let errorMessage = 'An error occurred during account creation or enrolment.';

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && 'errors' in err) {
          const clerkErr = err as { errors?: Array<{ message?: string }> };
          if (clerkErr.errors && Array.isArray(clerkErr.errors) && clerkErr.errors[0]?.message) {
            errorMessage = clerkErr.errors[0].message;
          }
        }

        console.error(`Failed processing ${student.email}:`, err);
        results.failed.push({
          email: student.email,
          reason: errorMessage
        });
      }
    }

    return apiOk(results);
  } catch (error) {
    return handleRouteError('MANUAL_ENROLMENT_POST', error);
  }
}
