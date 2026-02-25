import { db } from '@/lib/db';
import { logError } from '@/lib/debug';

export interface LogEntry {
  url: string;
  method: string;
  body?: string;
  response?: string;
  statusCode?: number;
  errorMessage?: string;
}

export async function logRequest(entry: LogEntry): Promise<void> {
  try {
    await db.logging.create({
      data: {
        ...entry,
        createdAt: new Date()
      }
    });
  } catch (error) {
    logError('LOGGING_WRITE_FAILED', error);
  }
}
