import { DataTable } from './_components/data-table';
import { columns } from './_components/columns';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const UsersPage = async ({ searchParams }: { searchParams: { q?: string; page?: string } }) => {
  const profile = await getSafeProfile();

  if (!profile) {
    return redirect('/');
  }

  const q = searchParams.q?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.ProfileWhereInput =
    profile.role !== 'ADMIN'
      ? { id: profile.id }
      : q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {};

  const [userData, total] = await Promise.all([
    db.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    db.profile.count({ where })
  ]);

  return (
    <div className="p-6">
      <h1>Users</h1>
      <DataTable
        columns={columns}
        data={userData}
        search={q}
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      />
    </div>
  );
};

export default UsersPage;
