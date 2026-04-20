import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { canEditCourse } from '@/lib/course-auth';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';
import { markReadSchema } from '@/lib/validations';

interface Params {
  params: { courseId: string };
}

// POST /api/v1/courses/[courseId]/messages/read
export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canEditCourse(userId, params.courseId);
    if (!allowed) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const profile = await currentProfile();
    if (!profile) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await req.json();
    const validation = validateRequest(markReadSchema, body);
    if (!validation.success) return validation.response;

    const studentEnrolled = await db.purchase.findFirst({
      where: { courseId: params.courseId, userId: validation.data.studentId }
    });
    if (!studentEnrolled)
      return apiErr('VALIDATION', 'Student is not enrolled in this course', 400);

    await db.mentorLastRead.upsert({
      where: {
        instructorId_courseId_studentId: {
          instructorId: profile.id,
          courseId: params.courseId,
          studentId: validation.data.studentId
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        instructorId: profile.id,
        courseId: params.courseId,
        studentId: validation.data.studentId,
        lastReadAt: new Date()
      }
    });

    return apiOk({ ok: true });
  } catch (error) {
    return handleRouteError('MESSAGES_READ_POST', error);
  }
}
