import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { canManageBlogs } from '@/lib/blog-auth';
import { IconBadge } from '@/components/icon-badge';
import { UserCircle } from 'lucide-react';
import { ProfileForm } from './_components/profile-form';

const TeacherProfilePage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/');
  }

  const isAuthorized = await canManageBlogs();
  if (!isAuthorized) {
    return redirect('/');
  }

  const author = await db.blogAuthor.findUnique({
    where: { userId }
  });

  return (
    <div className="p-6">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={UserCircle} />
        <h1 className="text-2xl font-medium">My Public Profile</h1>
      </div>
      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        This information will be displayed at the bottom of your blog posts.
      </div>

      <ProfileForm initialData={author} />
    </div>
  );
};

export default TeacherProfilePage;
