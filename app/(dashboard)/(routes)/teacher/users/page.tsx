import { DataTable } from './_components/data-table';
import { columns } from './_components/columns';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { redirect } from 'next/navigation';

const UsersPage = async () => {
  const profile = await getSafeProfile();

  if (!profile) {
    return redirect('/');
  }

  // Fetch user data from API or database
  const userData = await db.profile.findMany(
    profile.role !== 'ADMIN' ? { where: { id: profile.id } } : undefined
  );

  return (
    <div className="p-6">
      <h1>Users</h1>
      <DataTable columns={columns} data={userData} />
    </div>
  );
};

export default UsersPage;
