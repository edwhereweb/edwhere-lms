import React from 'react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

import { db } from '@/lib/db';
import { MemberRoleForm } from './_components/member-role-form';
import getSafeProfile from '@/actions/get-safe-profile';

interface ProfileIdPageProps {
  params: {
    id: string;
  };
}

const ProfileIdPage: React.FC<ProfileIdPageProps> = async ({ params }) => {
  const profile = await getSafeProfile();

  if (!profile) {
    return redirect('/teacher/users/');
  }

  // Only allow ADMINs to view/edit anyone. Non-admins can only view/edit their own profile.
  if (profile.role !== 'ADMIN' && profile.id !== params.id) {
    return redirect('/teacher/users/');
  }

  const targetProfile = await db.profile.findUnique({
    where: {
      id: params.id
    }
  });

  if (!targetProfile) {
    return redirect('/teacher/users/');
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border bg-slate-100 rounded-md p-4 dark:bg-gray-800">
          <h3 className="font-medium text-lg mb-4">User Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center border-b pb-2 border-slate-200 dark:border-gray-700">
              <span className="text-slate-500 dark:text-slate-400">Last Login:</span>
              <span className="font-medium">
                {targetProfile.lastLoginAt
                  ? format(new Date(targetProfile.lastLoginAt), 'MMM dd, yyyy, h:mm a')
                  : 'Never logged in'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-slate-500 dark:text-slate-400">Last IP Address:</span>
              <span className="font-medium font-mono">
                {targetProfile.lastLoginIp || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <MemberRoleForm
            initialData={targetProfile}
            id={targetProfile.id}
            isAdmin={profile.role === 'ADMIN'}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileIdPage;
