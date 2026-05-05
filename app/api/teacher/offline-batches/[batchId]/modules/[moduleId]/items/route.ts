import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createBatchItemSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; moduleId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, moduleId } = await params;
    const mod = await db.batchModule.findFirst({ where: { id: moduleId, batchId } });
    if (!mod) return apiError('Module not found', 404);

    const body = await req.json();
    const validation = validateBody(createBatchItemSchema, body);
    if (!validation.success) return validation.response;

    const { type, title, pdfUrl, resourceUrl, description, maxMarks, submissionType } =
      validation.data;

    if (type === 'TASK' && (!description || maxMarks === undefined || !submissionType)) {
      return apiError('Task items require description, maxMarks, and submissionType', 400);
    }

    const last = await db.batchItem.findFirst({
      where: { moduleId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const item = await db.batchItem.create({
      data: {
        moduleId,
        type,
        title,
        position: (last?.position ?? -1) + 1,
        pdfUrl: type === 'PDF' ? pdfUrl : null,
        resourceUrl: type === 'RESOURCE_LINK' ? resourceUrl : null,
        ...(type === 'TASK' && {
          task: {
            create: {
              description: description!,
              maxMarks: maxMarks!,
              submissionType: submissionType!
            }
          }
        })
      },
      include: { task: true }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_BATCH_ITEM', error);
  }
}
