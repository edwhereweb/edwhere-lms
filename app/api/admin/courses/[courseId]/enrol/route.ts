import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const enrolSchema = z.object({
  emails: z.array(z.string().email())
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
    const { emails } = enrolSchema.parse(body);

    if (!emails || emails.length === 0) {
      return new NextResponse('No emails provided', { status: 400 });
    }

    // Process enrolments
    const results = {
      successful: [] as string[],
      failed: [] as { email: string; reason: string }[],
      alreadyEnrolled: [] as string[]
    };

    for (const email of emails) {
      // Find the user profile by email
      // Note: We're doing this sequentially to handle individual errors cleanly and avoid complex bulk upserts with relations
      const targetUser = await db.profile.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });

      if (!targetUser) {
        results.failed.push({ email, reason: 'User account not found on the platform.' });
        continue;
      }

      // Check if already enrolled
      const existingPurchase = await db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId: targetUser.userId,
            courseId: courseId
          }
        }
      });

      if (existingPurchase) {
        results.alreadyEnrolled.push(email);
        continue;
      }

      // Create new purchase to grant access
      await db.purchase.create({
        data: {
          userId: targetUser.userId,
          courseId: courseId
        }
      });

      results.successful.push(email);
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid data format', { status: 400 });
    }
    console.error('[MANUAL_ENROLMENT_POST]', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
