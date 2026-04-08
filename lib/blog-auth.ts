import { currentProfile } from './current-profile';

export const canManageBlogs = async () => {
  const profile = await currentProfile();

  if (profile) {
    return (
      profile.role === 'ADMIN' ||
      profile.role === 'TEACHER' ||
      profile.role === 'MARKETER' ||
      profile.role === 'BLOGGER'
    );
  }

  return false;
};
