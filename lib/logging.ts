import { db } from '@/lib/db';

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
  } catch {
    console.error('[LOGGING_WRITE_FAILED]', entry.url);
  }
}
