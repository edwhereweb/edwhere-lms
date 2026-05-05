import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { approveUploadSchema } from '@/lib/validations';
import { db } from '@/lib/db';

type Params = { params: Promise<{ uploadId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
    if (profile?.role !== 'ADMIN') return apiError('Forbidden', 403);

    const { uploadId } = await params;
    const upload = await db.sessionUpload.findUnique({ where: { id: uploadId } });
    if (!upload) return apiError('Upload not found', 404);
    if (upload.status !== 'PENDING') return apiError('Upload is not pending review', 400);

    const body = await req.json();
    const validation = validateBody(approveUploadSchema, body);
    if (!validation.success) return validation.response;

    const newStatus = validation.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await db.sessionUpload.update({
      where: { id: uploadId },
      data: {
        status: newStatus,
        approvedBy: userId,
        approvedAt: new Date()
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('APPROVE_SESSION_UPLOAD', error);
  }
}
