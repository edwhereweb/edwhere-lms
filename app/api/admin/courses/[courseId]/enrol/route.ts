import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';

const enrolSchema = z.object({
  students: z.array(
    z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional()
    })
  )
});

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const profile = await currentProfile();

    if (!profile || profile.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { courseId } = params;

    // Ensure course exists
    const course = await db.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return new NextResponse('Course not found', { status: 404 });
    }

    const body = await req.json();
    const { students } = enrolSchema.parse(body);

    if (!students || students.length === 0) {
      return new NextResponse('No students provided', { status: 400 });
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
        await db.purchase.create({
          data: {
            userId: targetUserId,
            courseId: courseId
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

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[MANUAL_ENROLMENT_POST_VALIDATION_ERROR]', error.errors);
      return new NextResponse(
        `Invalid data format: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        { status: 400 }
      );
    }
    console.error('[MANUAL_ENROLMENT_POST]', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
