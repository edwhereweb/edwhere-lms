import React from 'react';
import { redirect } from 'next/navigation';

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
      <MemberRoleForm initialData={targetProfile} id={targetProfile.id} />
    </div>
  );
};

export default ProfileIdPage;
