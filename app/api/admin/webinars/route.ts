import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { createWebinarSchema } from '@/lib/validations';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const exists = await db.webinar.findUnique({ where: { slug } });
    if (!exists) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const webinars = await db.webinar.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { registrations: true } }
      }
    });

    return NextResponse.json(webinars);
  } catch (error) {
    return handleApiError('ADMIN_WEBINARS_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(createWebinarSchema, body);
    if (!validation.success) return validation.response;

    const { title } = validation.data;
    const slug = await uniqueSlug(slugify(title));

    const webinar = await db.webinar.create({
      data: {
        title,
        slug,
        scheduledAt: new Date(),
        createdBy: userId
      },
      include: {
        _count: { select: { registrations: true } }
      }
    });

    return NextResponse.json(webinar, { status: 201 });
  } catch (error) {
    return handleApiError('ADMIN_WEBINARS_POST', error);
  }
}
