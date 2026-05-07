import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { batchBulkEnrollSchema } from '@/lib/validations';
import { canEnrollInBatch } from '@/lib/batch-auth';
import { enrollStudentInBatch } from '@/lib/batch-enrollment';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEnrollInBatch(userId);
    if (!allowed) {
      return apiError('Forbidden — only admins and instructors can enroll students', 403);
    }

    const { batchId } = await params;
    const body = await req.json();
    const validation = validateBody(batchBulkEnrollSchema, body);
    if (!validation.success) return validation.response;

    const { emails } = validation.data;

    // Deduplicate emails and convert to lowercase for case-insensitive matching
    const uniqueEmails = Array.from(new Set(emails.map((e) => e.toLowerCase().trim())));

    // Find existing profiles matching these emails
    const profiles = await db.profile.findMany({
      where: {
        OR: uniqueEmails.map((email) => ({
          email: { equals: email, mode: 'insensitive' }
        }))
      },
      select: { email: true, userId: true }
    });

    const foundEmails = new Set(profiles.map((p) => p.email.toLowerCase()));

    const enrolled: string[] = [];
    const failed: string[] = [];

    // Separate found vs not found
    for (const email of uniqueEmails) {
      if (!foundEmails.has(email)) {
        failed.push(email);
      }
    }

    // Enroll found users
    for (const profile of profiles) {
      const result = await enrollStudentInBatch(batchId, profile.userId, userId);
      if (result.enrolled) {
        enrolled.push(profile.email);
      } else {
        // Technically it found the profile but failed to enroll (e.g. batch missing)
        failed.push(profile.email);
      }
    }

    return NextResponse.json(
      {
        enrolled,
        failed
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError('BULK_ENROLL_BATCH_STUDENT', error);
  }
}
