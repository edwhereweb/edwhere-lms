import { currentProfile } from '@/lib/current-profile';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { EnrolmentForm } from './_components/enrolment-form';

export default async function ManualEnrolmentsPage() {
  const profile = await currentProfile();

  if (!profile || profile.role !== 'ADMIN') {
    return redirect('/');
  }

  const courses = await db.course.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      title: true,
      price: true,
      isPublished: true
    }
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-poppins text-slate-900">Manual Course Enrolment</h1>
        <p className="text-slate-600 mt-2 font-inter">
          Enroll students manually into specific courses either one-by-one or via CSV upload.
        </p>
      </div>

      <EnrolmentForm courses={courses} />
    </div>
  );
}
