import { currentProfile } from './current-profile';

export const isBlogger = async () => {
  const profile = await currentProfile();
  if (profile) {
    return profile.role === 'BLOGGER' || profile.role === 'ADMIN';
  }
  return false;
};
