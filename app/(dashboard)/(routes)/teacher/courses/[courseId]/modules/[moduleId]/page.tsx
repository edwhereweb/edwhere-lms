import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { IconBadge } from '@/components/icon-badge';
import { Banner } from '@/components/banner';
import { ModuleTitleForm } from './_components/module-title-form';
import { ModuleDescriptionForm } from './_components/module-description-form';
import { ModuleActions } from './_components/module-actions';

const ModuleIdPage = async ({ params }: { params: { courseId: string; moduleId: string } }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  // Check permissions — owner, instructor, or admin
  const allowed = await canEditCourse(userId, params.courseId);
  if (!allowed) return redirect('/teacher/courses');

  const moduleItem = await db.module.findUnique({
    where: {
      id: params.moduleId,
      courseId: params.courseId
    },
    include: {
      chapters: {
        where: {
          isPublished: true
        }
      }
    }
  });

  if (!moduleItem) return redirect(`/teacher/courses/${params.courseId}/structure`);

  const requiredFields = [moduleItem.title, moduleItem.description];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;
  const completionText = `(${completedFields} / ${totalFields})`;
  const isComplete = requiredFields.every(Boolean) && moduleItem.chapters.length > 0;

  return (
    <>
      {!moduleItem.isPublished && (
        <Banner
          variant="warning"
          label="This module is unpublished. It will not be visible in the course."
        />
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="w-full">
            <Link
              href={`/teacher/courses/${params.courseId}/structure`}
              className="flex items-center text-sm hover:opacity-75 transition mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to course setup
            </Link>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-y-2">
                <h1 className="text-2xl font-medium">Module Creation</h1>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Complete all fields {completionText}
                </span>
              </div>
              <ModuleActions
                disabled={!isComplete}
                courseId={params.courseId}
                moduleId={params.moduleId}
                isPublished={moduleItem.isPublished}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={LayoutDashboard} />
                <h2 className="text-xl">Customize your module</h2>
              </div>
              <ModuleTitleForm
                initialData={moduleItem}
                courseId={params.courseId}
                moduleId={params.moduleId}
              />
              <ModuleDescriptionForm
                initialData={moduleItem}
                courseId={params.courseId}
                moduleId={params.moduleId}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModuleIdPage;
