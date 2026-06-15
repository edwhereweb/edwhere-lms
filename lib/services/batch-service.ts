import { db } from '@/lib/db';
import type { z } from 'zod';
import type { createBatchSchema } from '@/lib/validations';

type CreateBatchInput = z.infer<typeof createBatchSchema>;

export { getBatches, getBatchDetail } from '@/actions/get-batches';

export async function createBatch(userId: string, data: CreateBatchInput) {
  return db.batch.create({
    data: {
      title: data.title,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      allowSameDayOfflineSession: data.allowSameDayOfflineSession ?? false,
      createdBy: userId
    }
  });
}
