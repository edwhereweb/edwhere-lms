import { currentProfile } from './current-profile';

export const isMarketer = async () => {
  const profile = await currentProfile();
  if (profile) {
    return profile.role === 'MARKETER' || profile.role === 'ADMIN';
  }
  return false;
};
