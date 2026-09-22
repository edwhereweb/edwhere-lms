import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { updateWebinarSchema } from '@/lib/validations';

interface Params {
  params: { webinarId: string };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const webinar = await db.webinar.findUnique({
      where: { id: params.webinarId },
      include: { _count: { select: { registrations: true } } }
    });

    if (!webinar) return apiError('Webinar not found', 404);

    return NextResponse.json(webinar);
  } catch (error) {
    return handleApiError('ADMIN_WEBINAR_GET', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(updateWebinarSchema, body);
    if (!validation.success) return validation.response;

    // If slug is being changed, enforce uniqueness (exclude current record)
    if (validation.data.slug) {
      const existing = await db.webinar.findUnique({ where: { slug: validation.data.slug } });
      if (existing && existing.id !== params.webinarId) {
        return apiError('A webinar with this slug already exists', 409);
      }
    }

    const webinar = await db.webinar.update({
      where: { id: params.webinarId },
      data: {
        ...validation.data,
        // Convert ISO string to Date for Prisma
        scheduledAt: validation.data.scheduledAt ? new Date(validation.data.scheduledAt) : undefined
      }
    });

    return NextResponse.json(webinar);
  } catch (error) {
    return handleApiError('ADMIN_WEBINAR_PATCH', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    await db.webinar.delete({ where: { id: params.webinarId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError('ADMIN_WEBINAR_DELETE', error);
  }
}
