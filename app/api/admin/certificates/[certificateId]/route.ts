import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';

type Params = { params: Promise<{ certificateId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can revoke certificates', 403);
    }

    const { certificateId } = await params;

    const existing = await db.certificate.findUnique({ where: { id: certificateId } });
    if (!existing) return apiError('Certificate not found', 404);

    await db.certificate.delete({ where: { id: certificateId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('DELETE_CERTIFICATE', error);
  }
}
