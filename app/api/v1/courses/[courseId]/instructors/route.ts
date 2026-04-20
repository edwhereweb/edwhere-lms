import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { instructorSchema } from '@/lib/validations';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || !['ADMIN', 'TEACHER'].includes(profile.role)) {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const rows = await db.courseInstructor.findMany({
      where: { courseId: params.courseId },
      include: { profile: true }
    });

    return apiOk(rows.map((r) => r.profile));
  } catch (error) {
    return handleRouteError('INSTRUCTORS_GET', error);
  }
}

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const [profile, course] = await Promise.all([
      db.profile.findUnique({ where: { userId } }),
      db.course.findUnique({ where: { id: params.courseId } })
    ]);

    if (!course) return apiErr('NOT_FOUND', 'Not Found', 404);

    const isAdmin = profile?.role === 'ADMIN';
    if (!isAdmin && course.userId !== userId) {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateRequest(instructorSchema, body);
    if (!validation.success) return validation.response;

    const instructor = await db.courseInstructor.create({
      data: { courseId: params.courseId, profileId: validation.data.profileId },
      include: { profile: true }
    });

    return apiOk(instructor.profile);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return apiErr('CONFLICT', 'Already an instructor', 409);
    }
    return handleRouteError('INSTRUCTORS_POST', error);
  }
}

export async function DELETE(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const [profile, course] = await Promise.all([
      db.profile.findUnique({ where: { userId } }),
      db.course.findUnique({ where: { id: params.courseId } })
    ]);

    if (!course) return apiErr('NOT_FOUND', 'Not Found', 404);

    const isAdmin = profile?.role === 'ADMIN';
    if (!isAdmin && course.userId !== userId) {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateRequest(instructorSchema, body);
    if (!validation.success) return validation.response;

    await db.courseInstructor.deleteMany({
      where: { courseId: params.courseId, profileId: validation.data.profileId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError('INSTRUCTORS_DELETE', error);
  }
}
