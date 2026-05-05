import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { registerSessionUploadSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { isUploadLate, resolveUploadStatus } from '@/lib/session-upload';
import { db } from '@/lib/db';

type Params = { params: Promise<{ itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const uploads = await db.sessionUpload.findMany({
      where: { session: { itemId } },
      include: { logs: { orderBy: { uploadedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(uploads);
  } catch (error) {
    return handleApiError('GET_SESSION_UPLOADS', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);

    const body = await req.json();
    const validation = validateBody(registerSessionUploadSchema, body);
    if (!validation.success) return validation.response;

    const now = new Date();
    const late = isUploadLate(session.scheduledAt, now);
    const status = resolveUploadStatus(session.scheduledAt, now);

    const upload = await db.sessionUpload.create({
      data: {
        sessionId: session.id,
        type: validation.data.type,
        fileUrl: validation.data.fileUrl,
        filename: validation.data.filename,
        status,
        uploadedBy: userId,
        logs: {
          create: {
            isLate: late,
            uploadedAt: now,
            uploadedBy: userId
          }
        }
      },
      include: { logs: true }
    });

    return NextResponse.json({ ...upload, isLate: late }, { status: 201 });
  } catch (error) {
    return handleApiError('REGISTER_SESSION_UPLOAD', error);
  }
}
