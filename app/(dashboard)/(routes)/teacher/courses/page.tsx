import { DataTable } from './_components/data-table';
import { columns } from './_components/columns';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

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

  const courses = await db.course.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="p-6">
      <DataTable columns={columns} data={courses} />
    </div>
  );
};

export default CoursesPage;
