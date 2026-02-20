import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { checkCourseEdit } from '@/lib/course-auth';
import { attachmentSchema } from '@/lib/validations';
import { validateBody, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateBody(attachmentSchema, body);
    if (!validation.success) return validation.response;

    const { url, originalFilename } = validation.data;
    const name = originalFilename || url.split('/').pop() || 'Untitled';

    const attachment = await db.attachment.create({
      data: {
        url,
        name,
        courseId: params.courseId
      }
    });

    return NextResponse.json(attachment);
  } catch (error) {
    return handleApiError('COURSE_ID_ATTACHMENTS', error);
  }
}
