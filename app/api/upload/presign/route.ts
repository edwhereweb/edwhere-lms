import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { presignSchema, ALLOWED_CONTENT_TYPES, type UploadType } from '@/lib/validations';
import { isTeacher } from '@/lib/teacher';
import { createPresignedPutUrl } from '@/lib/r2';
import crypto from 'crypto';
import path from 'path';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

function buildKey(
  type: UploadType,
  userId: string,
  filename: string,
  ids: { courseId?: string; chapterId?: string; blogId?: string }
): string {
  const uuid = crypto.randomUUID();
  const ext = path.extname(filename).toLowerCase() || '.bin';
  const safe = sanitizeFilename(path.basename(filename, ext));

  switch (type) {
    case 'profileImage':
      return `public/profile-images/${userId}/${uuid}${ext}`;
    case 'courseImage':
      return `public/course-images/${ids.courseId}/${uuid}${ext}`;
    case 'courseAttachment':
      return `private/attachments/${ids.courseId}/${uuid}-${safe}${ext}`;
    case 'chapterPdf':
      return `private/chapter-pdfs/${ids.chapterId}/${uuid}.pdf`;
    case 'questionImage':
      return `private/question-images/${ids.courseId}/${uuid}${ext}`;
    case 'blogAuthorImage':
      return `public/blog-authors/${uuid}${ext}`;
    case 'blogPostImage':
      return `public/blog-images/${ids.blogId || 'general'}/${uuid}${ext}`;
    case 'blogPostCover':
      return `public/blog-covers/${ids.blogId || 'general'}/${uuid}${ext}`;
  }
}

function resolveContentType(type: UploadType, filename: string, explicit?: string): string {
  if (explicit) return explicit;

  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const authorized = await isTeacher();
    if (!authorized) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(presignSchema, body);
    if (!validation.success) return validation.response;

    const {
      type,
      filename,
      contentType: explicitContentType,
      courseId,
      chapterId,
      blogId
    } = validation.data;

    if (
      (type === 'courseImage' || type === 'courseAttachment' || type === 'questionImage') &&
      !courseId
    ) {
      return apiError('courseId is required for this upload type', 400);
    }
    if (type === 'chapterPdf' && !chapterId) {
      return apiError('chapterId is required for this upload type', 400);
    }

    const contentType = resolveContentType(type, filename, explicitContentType);
    const allowed = ALLOWED_CONTENT_TYPES[type];
    if (!allowed.includes(contentType)) {
      return apiError(`Content type "${contentType}" is not allowed for ${type}`, 400);
    }

    const key = buildKey(type, userId, filename, { courseId, chapterId, blogId });
    const uploadUrl = await createPresignedPutUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    return handleApiError('UPLOAD_PRESIGN', error);
  }
}
