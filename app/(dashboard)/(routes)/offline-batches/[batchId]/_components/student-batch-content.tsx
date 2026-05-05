'use client';

import { StudentBatchContent } from '@/app/(dashboard)/(routes)/teacher/offline-batches/_components/student-batch-content-view';
import type { BatchContentModule } from '@/actions/get-batches';

interface StudentBatchContentWrapperProps {
  batchId: string;
  modules: BatchContentModule[];
}

// Thin client wrapper so the page can be a server component
export function StudentBatchContentWrapper({ batchId, modules }: StudentBatchContentWrapperProps) {
  return <StudentBatchContent batchId={batchId} modules={modules} />;
}
