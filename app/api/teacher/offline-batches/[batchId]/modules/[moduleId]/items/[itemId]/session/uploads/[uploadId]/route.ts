import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { canManageBatch } from '@/lib/batch-auth';
import { deleteObject, urlToR2Key } from '@/lib/r2';
import { db } from '@/lib/db';

type Params = { params: Promise<{ itemId: string; uploadId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { uploadId } = await params;
    const upload = await db.sessionUpload.findUnique({ where: { id: uploadId } });
    if (!upload) return apiError('Upload not found', 404);

    // Best-effort R2 cleanup
    const r2Key = urlToR2Key(upload.fileUrl);
    if (r2Key) {
      await deleteObject(r2Key).catch(() => {});
    }

    await db.sessionUpload.delete({ where: { id: uploadId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError('DELETE_SESSION_UPLOAD', error);
  }
}
