import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { z } from 'zod';

type Params = { params: Promise<{ certificateId: string }> };

const updateCertSchema = z.object({
  recipientName: z.string().min(1).max(200).optional(),
  courseName: z.string().min(1).max(200).optional(),
  duration: z.string().min(1).max(100).optional(),
  deliveryMode: z.enum(['Online', 'Offline', 'Hybrid']).optional(),
  dateOfAchievement: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  score: z.number().min(0).max(100).nullable().optional()
});

async function adminGuard(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  return profile?.role === 'ADMIN';
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);
    if (!(await adminGuard(userId))) return apiError('Forbidden', 403);

    const { certificateId } = await params;
    const existing = await db.certificate.findUnique({ where: { id: certificateId } });
    if (!existing) return apiError('Certificate not found', 404);

    const body = await req.json();
    const validation = validateBody(updateCertSchema, body);
    if (!validation.success) return validation.response;

    const updated = await db.certificate.update({
      where: { id: certificateId },
      data: validation.data
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('PATCH_CERTIFICATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);
    if (!(await adminGuard(userId)))
      return apiError('Forbidden — only admins can revoke certificates', 403);

    const { certificateId } = await params;

    const existing = await db.certificate.findUnique({ where: { id: certificateId } });
    if (!existing) return apiError('Certificate not found', 404);

    await db.certificate.delete({ where: { id: certificateId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('DELETE_CERTIFICATE', error);
  }
}
