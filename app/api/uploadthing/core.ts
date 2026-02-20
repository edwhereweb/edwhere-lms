import { auth } from '@clerk/nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { debug } from '@/lib/debug';
import { isTeacher } from '@/lib/teacher';

const f = createUploadthing();

const handleAuth = async () => {
  const session = await auth();
  if (!session || !session.userId) throw new Error('Unauthorized');

  const isAuthorized = await isTeacher();
  if (!isAuthorized) throw new Error('Unauthorized');

  return { userId: session.userId };
};

export const ourFileRouter = {
  profileImage: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(async () => await handleAuth())
    .onUploadComplete(({ metadata, file }) => {
      debug('UPLOAD_PROFILE_IMAGE', metadata.userId, file.url);
    }),
  courseImage: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(async () => await handleAuth())
    .onUploadComplete(({ metadata, file }) => {
      debug('UPLOAD_COURSE_IMAGE', metadata.userId, file.url);
    }),
  courseAttachment: f(['text', 'image', 'video', 'audio', 'pdf'])
    .middleware(async () => await handleAuth())
    .onUploadComplete(({ metadata, file }) => {
      debug('UPLOAD_ATTACHMENT', metadata.userId, file.url);
    }),
  chapterVideo: f({ video: { maxFileCount: 1, maxFileSize: '2GB' } })
    .middleware(async () => await handleAuth())
    .onUploadComplete(({ metadata, file }) => {
      debug('UPLOAD_CHAPTER_VIDEO', metadata.userId, file.url);
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
