import { DataTable } from './_components/data-table';
import { columns } from './_components/columns';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';

const CoursesPage = async () => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    return redirect('/sign-in');
  }

  const isAuthorized = await isTeacher();
  if (!isAuthorized) {
    return redirect('/');
  }

  const profile = await getSafeProfile();
  if (!profile) {
    return redirect('/');
  }

  let courses = [];

  if (profile.role === 'ADMIN') {
    // Admins see all courses
    courses = await db.course.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  } else {
    // Teachers see courses they own OR courses they are assigned to as an instructor
    courses = await db.course.findMany({
      where: {
        OR: [
          { userId },
          {
            instructors: {
              some: { profileId: profile.id }
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  return (
    <div className="p-6">
      <DataTable columns={columns} data={courses} />
    </div>
  );
};

export default CoursesPage;
