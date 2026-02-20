import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { instructorSchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';

export async function GET(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || !['ADMIN', 'TEACHER'].includes(profile.role)) {
      return apiError('Forbidden', 403);
    }

    const rows = await db.courseInstructor.findMany({
      where: { courseId: params.courseId },
      include: { profile: true }
    });

    return NextResponse.json(rows.map((r) => r.profile));
  } catch (error) {
    return handleApiError('INSTRUCTORS_GET', error);
  }
}

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const [profile, course] = await Promise.all([
      db.profile.findUnique({ where: { userId } }),
      db.course.findUnique({ where: { id: params.courseId } })
    ]);

    if (!course) return apiError('Not Found', 404);

    const isAdmin = profile?.role === 'ADMIN';
    if (!isAdmin && course.userId !== userId) {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateBody(instructorSchema, body);
    if (!validation.success) return validation.response;

    const instructor = await db.courseInstructor.create({
      data: { courseId: params.courseId, profileId: validation.data.profileId },
      include: { profile: true }
    });

    return NextResponse.json(instructor.profile);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return apiError('Already an instructor', 409);
    }
    return handleApiError('INSTRUCTORS_POST', error);
  }
}

export async function DELETE(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const [profile, course] = await Promise.all([
      db.profile.findUnique({ where: { userId } }),
      db.course.findUnique({ where: { id: params.courseId } })
    ]);

    if (!course) return apiError('Not Found', 404);

    const isAdmin = profile?.role === 'ADMIN';
    if (!isAdmin && course.userId !== userId) {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateBody(instructorSchema, body);
    if (!validation.success) return validation.response;

    await db.courseInstructor.deleteMany({
      where: { courseId: params.courseId, profileId: validation.data.profileId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError('INSTRUCTORS_DELETE', error);
  }
}
