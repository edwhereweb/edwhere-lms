import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { getPageCount, getPagination } from '@/lib/pagination';
import { WebinarsClient, type Webinar } from './_components/webinars-client';

export const dynamic = 'force-dynamic';

const AdminWebinarsPage = async ({ searchParams }: { searchParams: { page?: string } }) => {
  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') return redirect('/dashboard');

  const { page, skip, take } = getPagination(searchParams.page);

  const [total, webinars] = await Promise.all([
    db.webinar.count(),
    db.webinar.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        scheduledAt: true,
        durationMinutes: true,
        isPublished: true,
        meetLink: true,
        createdAt: true,
        _count: { select: { registrations: true } }
      }
    })
  ]);

  return (
    <WebinarsClient
      initialWebinars={JSON.parse(JSON.stringify(webinars)) as Webinar[]}
      page={page}
      pageCount={getPageCount(total)}
    />
  );
};

export default AdminWebinarsPage;
