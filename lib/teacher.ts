import { currentProfile } from './current-profile';

export const isTeacher = async () => {
  const profile = await currentProfile();

  if (profile) {
    return profile.role === 'ADMIN' || profile.role === 'TEACHER';
  }
  return false;
};
