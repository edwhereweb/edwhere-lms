import { GOOGLE_SCOPES, googleRequest } from './auth';

/** Grants read-only Drive access to a single Workspace user (idempotent on Google's side). */
export async function shareFileWithUser(fileId: string, email: string): Promise<void> {
  await googleRequest<unknown>({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
    method: 'POST',
    scopes: [GOOGLE_SCOPES.drive],
    params: { sendNotificationEmail: false, supportsAllDrives: true },
    data: { type: 'user', role: 'reader', emailAddress: email }
  });
}

/** Grants read-only access to anyone with the link so learners in the course can watch the recording. */
export async function makeFileLinkReadable(fileId: string): Promise<void> {
  await googleRequest<unknown>({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
    method: 'POST',
    scopes: [GOOGLE_SCOPES.drive],
    params: { supportsAllDrives: true },
    data: { type: 'anyone', role: 'reader' }
  });
}
