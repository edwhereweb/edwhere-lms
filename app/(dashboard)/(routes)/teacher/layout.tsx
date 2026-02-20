import { isTeacher } from '@/lib/teacher';
import { redirect } from 'next/navigation';

const TeacherLayout = async ({ children }: { children: React.ReactNode }) => {
  const isAuthorized = await isTeacher();

  if (!isAuthorized) {
    return redirect('/');
  }

  return <>{children}</>;
};

export default TeacherLayout;
